import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { promotionApi, type ClientCoupon, type ValidateCouponInput } from '@/services/promotion';
import { useAuthStore } from '@/store/authStore';

// Why: 优惠券/促销 hook 层。
//   useCoupons           —— 我的券列表（cart/profile 的 Coupons 入口、checkout 券选择 UI 数据源）
//   useValidateCoupon    —— 选中券后实时算折扣（checkout 选券触发，UI 拆后续）
//   useAvailableCoupons  —— 领券中心可领模板（领券中心页数据源）
//   useClaimCoupon       —— 领取券（进我的卡包）
// 券选择 UI 未落地前，这俩 hook 是数据层就绪状态，供后续 checkout 直接消费。

// Why: 按 status 分 key（available/used/expired 各自缓存独立，tab 切换不互相覆盖）
export const COUPONS_QUERY_KEY = (status: string) => ['coupons', status] as const;

export function useCoupons(status: 'available' | 'used' | 'expired' = 'available') {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: COUPONS_QUERY_KEY(status),
    queryFn: () => promotionApi.listCoupons(status),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录不请求，避免 401
  });
}

// Why: validate 按 code+orderAmount 分 key（金额变/换券自动重查）；deliveryFee 进 key 避免免运券脏缓存
export const VALIDATE_COUPON_KEY = (
  code: string,
  orderAmount: number,
  deliveryFee: number,
) => ['coupon-validate', code, orderAmount, deliveryFee] as const;

/**
 * 校验券码算折扣。input 为 null 时不请求（无选中券）。
 * checkout 选券 UI 落地后传入 { code, orderAmount, deliveryFee } 即可拿 discount。
 */
export function useValidateCoupon(input: ValidateCouponInput | null) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const code = input?.code ?? '';
  const orderAmount = input?.orderAmount ?? 0;
  const deliveryFee = input?.deliveryFee ?? 0;
  return useQuery({
    queryKey: VALIDATE_COUPON_KEY(code, orderAmount, deliveryFee),
    queryFn: () =>
      promotionApi.validate({
        code,
        orderAmount,
        deliveryFee,
      }),
    staleTime: 30 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated && code.length > 0 && orderAmount > 0,
  });
}

// Why: 领券中心 queryKey —— 第二段用 'available-templates' 与我的卡包
//      COUPONS_QUERY_KEY('available')（['coupons','available']）区分，
//      避免任一侧 invalidate 精确匹配误伤对方缓存。
export const AVAILABLE_COUPONS_KEY = ['coupons', 'available-templates'] as const;

/** 领券中心：当前用户可领的券模板（后端已排除已领 + 未超额，看到的都能领） */
export function useAvailableCoupons() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: AVAILABLE_COUPONS_KEY,
    queryFn: () => promotionApi.listAvailableCoupons(),
    staleTime: 30 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated,
  });
}

/**
 * 领取券。乐观移除已领项（规则 25 onMutate 三件套）：
 * 点「领取」立即从领券中心列表消失，失败 rollback 回来。
 * onSuccess invalidate 我的卡包（新券进卡包）—— invalidate 领券中心列表
 * 由 rollback 场景兜底（onError 后回滚的列表可能与后端有偏差，refetch 校准）。
 */
export function useClaimCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (promotionId: string) => promotionApi.claimCoupon(promotionId),
    onMutate: async (promotionId) => {
      await qc.cancelQueries({ queryKey: AVAILABLE_COUPONS_KEY });
      const prev = qc.getQueryData<ClientCoupon[]>(AVAILABLE_COUPONS_KEY);
      if (prev) {
        qc.setQueryData(
          AVAILABLE_COUPONS_KEY,
          prev.filter((c) => c.id !== promotionId),
        );
      }
      return { prev };
    },
    onError: (_err, _promotionId, ctx) => {
      // rollback：领取失败（如 E-COUPON-003 重复领 / 已超额）卡回到列表
      if (ctx?.prev) {
        qc.setQueryData(AVAILABLE_COUPONS_KEY, ctx.prev);
      }
    },
    onSuccess: () => {
      // 新券进我的卡包（available tab）
      qc.invalidateQueries({ queryKey: COUPONS_QUERY_KEY('available') });
      // 领券中心重拉校准（乐观移除外的排序/新增模板）
      qc.invalidateQueries({ queryKey: AVAILABLE_COUPONS_KEY });
    },
  });
}
