import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  alertSubscriptionApi,
  type AlertSubscriptionType,
  type SubscriptionItem,
} from '@/services/subscriptions';
import { useAuthStore } from '@/store/authStore';

/**
 * 我的提醒订阅（C7/C8，客户画像批5）
 *
 * - 登录门控：匿名 enabled=false 不请求（端点 Roles CUSTOMER，401 无意义）
 * - queryKey 带 type：PRICE_ALERT / RESTOCK_ALERT 各自缓存
 */
export function useAlertSubscriptions(type: AlertSubscriptionType) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<SubscriptionItem[]>({
    queryKey: ['subscriptions', type],
    queryFn: () => alertSubscriptionApi.listMine(type),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

/**
 * 订阅/取消订阅 toggle mutation（C7 降价 / C8 到货 商品页入口按钮）
 *
 * 已订阅 → DELETE；未订阅 → POST（upsert 语义，重订阅恢复 enabled）。
 * onSuccess invalidate ['subscriptions', type] 回显按钮态。
 * Why 无 onMutate：按钮态由服务端列表回显（toggle 乐观态与回显竞争易闪烁），
 * pending 态由按钮 disabled 承担；纯创建/删除类符合规则 25 豁免口径。
 */
export function useToggleAlertSubscription(type: AlertSubscriptionType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { productId: string; subscriptionId: string | null }) => {
      if (vars.subscriptionId) {
        await alertSubscriptionApi.unsubscribe(vars.subscriptionId);
      } else {
        await alertSubscriptionApi.subscribe(vars.productId, type);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions', type] });
    },
  });
}
