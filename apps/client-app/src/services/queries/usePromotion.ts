import { useQuery } from '@tanstack/react-query';
import { promotionApi, type ValidateCouponInput } from '@/services/promotion';
import { useAuthStore } from '@/store/authStore';

// Why: 优惠券/促销 hook 层。
//   useCoupons           —— 我的券列表（cart/profile 的 Coupons 入口、checkout 券选择 UI 数据源）
//   useValidateCoupon    —— 选中券后实时算折扣（checkout 选券触发，UI 拆后续）
// 券选择 UI 未落地前，这俩 hook 是数据层就绪状态，供后续 checkout 直接消费。

export const COUPONS_QUERY_KEY = ['coupons'] as const;

export function useCoupons() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: COUPONS_QUERY_KEY,
    queryFn: () => promotionApi.listCoupons(),
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
