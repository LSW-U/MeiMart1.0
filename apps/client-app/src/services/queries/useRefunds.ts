import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refundApi, type CreateRefundPayload, type RefundRaw } from '@/services/refunds';

export const REFUNDS_QUERY_KEY = ['refunds'] as const;

/**
 * 单个 refund 详情 queryKey（P14 useRefundDetail 用）
 * 形如 ['refunds', id]，与列表 key ['refunds'] 是父子关系（invalidate 前缀可同时失效）
 */
export const refundDetailKey = (id: string) => ['refunds', id] as const;

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
        userId: 'optimistic-user',
        amount: 0,
        reason: payload.reason,
        reasonDetail: payload.reasonDetail ?? null,
        status: 'PENDING',
        transactionId: null,
        refundMethod: 'COD',
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
        photos: [],
        refundType: payload.refundType ?? 'REFUND_ONLY',
        pickupAt: null,
        pickedAt: null,
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

/**
 * 退款详情（P14 主数据源）
 *
 * staleTime 30s：详情页用户可能反复进（从列表 → 详情 → 返回 → 详情），短缓存减少重复请求
 * 后端 RefundView 字段全（items[] + 时间戳），P14 据此渲染多商品/状态色/时间轴/退款方式
 */
export function useRefundDetail(id: string | undefined) {
  return useQuery({
    queryKey: refundDetailKey(id ?? ''),
    queryFn: () => refundApi.getRefundDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * 撤回退款申请（P14 取消按钮）
 *
 * 三件套（规则 25，取消后期望立即视觉反馈 — 状态色块 + 底部栏切换）:
 * - onMutate：detail query 前置乐观 CANCELLED（用户点取消立即看到状态变化）
 * - onError：rollback 到 previous
 * - onSettled：invalidate detail（real 数据替换乐观）
 *
 * 路由/Toast 由组件层 mutateAsync.then 处理
 */
export function useCancelRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refundApi.cancelRefund(id),
    onMutate: async (id) => {
      const key = refundDetailKey(id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<RefundRaw>(key);
      if (previous) {
        const optimistic: RefundRaw = {
          ...previous,
          status: 'CANCELLED',
          updatedAt: new Date().toISOString(),
        };
        qc.setQueryData<RefundRaw>(key, optimistic);
      }
      return { previous, key };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous && ctx?.key) {
        qc.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: refundDetailKey(id) });
      qc.invalidateQueries({ queryKey: REFUNDS_QUERY_KEY });
    },
  });
}
