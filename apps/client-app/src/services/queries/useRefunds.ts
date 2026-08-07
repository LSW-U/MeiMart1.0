import { useMutation, useQueryClient } from '@tanstack/react-query';
import { refundApi, type CreateRefundPayload, type RefundRaw } from '@/services/refunds';

export const REFUNDS_QUERY_KEY = ['refunds'] as const;

/**
 * 创建退款（整单 + 部分退款共用，Commit 7 整单 / Commit 8 多商品 items[]）
 *
 * 三件套（规则 25，提交后期望立即视觉反馈）:
 * - onMutate：refund 列表前置乐观项（PENDING），用户返回列表立即看到新申请
 * - onError：rollback 到 previous
 * - onSettled：invalidate 重拉（real 数据替换乐观项）
 *
 * 跳转由组件层 mutateAsync.then 处理（传 refund.id 跳 detail，组件层关心路由）
 */
export function useCreateRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRefundPayload) => refundApi.createRefund(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: REFUNDS_QUERY_KEY });
      const previous = qc.getQueryData<RefundRaw[]>(REFUNDS_QUERY_KEY);
      const optimistic: RefundRaw = {
        id: `optimistic-${Date.now()}`,
        orderId: payload.orderId,
        amount: 0,
        reason: payload.reason,
        reasonDetail: payload.reasonDetail ?? null,
        status: 'PENDING',
        refundMethod: 'COD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData<RefundRaw[]>(REFUNDS_QUERY_KEY, (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(REFUNDS_QUERY_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: REFUNDS_QUERY_KEY });
    },
  });
}
