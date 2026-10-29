import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { promotionApi, type ClientCoupon, type ValidateCouponInput } from '@/services/promotion';
import { useAuthStore } from '@/store/authStore';
import {
  STALE_TIME,
  COUPONS_QUERY_KEY,
  VALIDATE_COUPON_KEY,
  AVAILABLE_COUPONS_KEY,
} from '@/lib/queryKeys';

// key 定义集中迁 @/lib/queryKeys（批1 收编）；re-export 保持调用方 import 路径不变。
// 语义注解（原位保留）：按 status 分 key（available/used/expired 各自缓存独立）；
// validate 按 code+orderAmount 分 key，deliveryFee 进 key 避免免运券脏缓存；
// 领券中心第二段用 'available-templates' 与卡包 ['coupons','available'] 区分，
// 避免任一侧 invalidate 精确匹配误伤对方缓存。
export { COUPONS_QUERY_KEY, VALIDATE_COUPON_KEY, AVAILABLE_COUPONS_KEY } from '@/lib/queryKeys';

// Why: 优惠券/促销 hook 层。
//   useCoupons           —— 我的券列表（cart/profile 的 Coupons 入口、checkout 券选择 UI 数据源）
//   useValidateCoupon    —— 选中券后实时算折扣（checkout 选券触发，UI 拆后续）
//   useAvailableCoupons  —— 领券中心可领模板（领券中心页数据源）
//   useClaimCoupon       —— 领取券（进我的卡包）
// 券选择 UI 未落地前，这俩 hook 是数据层就绪状态，供后续 checkout 直接消费。

export function useCoupons(
  status: 'available' | 'used' | 'expired' = 'available',
  // C-P2-19: 可选 enabled 覆盖（coupons 页按 tab 懒加载用）；默认 undefined = 仅受登录态控制
  opts?: { enabled?: boolean },
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: COUPONS_QUERY_KEY(status),
    queryFn: () => promotionApi.listCoupons(status),
    staleTime: STALE_TIME.coupons,
    networkMode: 'offlineFirst',
    enabled: opts?.enabled !== undefined ? opts.enabled : isAuthenticated, // 未登录不请求，避免 401
  });
}

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
    staleTime: STALE_TIME.couponValidate,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated && code.length > 0 && orderAmount > 0,
  });
}

/** 领券中心：当前用户可领的券模板（后端已排除已领 + 未超额，看到的都能领） */
export function useAvailableCoupons() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: AVAILABLE_COUPONS_KEY,
    queryFn: () => promotionApi.listAvailableCoupons(),
    staleTime: STALE_TIME.availableCoupons,
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
    onSettled: () => {
      // D17（方案v2）：onSuccess→onSettled——成功失败都失效。领取失败时可用额度
      // 也可能变（服务端库存校验），失效更安全；多一次请求可接受。
      // 新券进我的卡包（available tab）
      void qc.invalidateQueries({ queryKey: COUPONS_QUERY_KEY('available') });
      // 领券中心重拉校准（乐观移除外的排序/新增模板；失败时 rollback 后 refetch 校准）
      void qc.invalidateQueries({ queryKey: AVAILABLE_COUPONS_KEY });
    },
  });
}
