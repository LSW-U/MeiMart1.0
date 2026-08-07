/**
 * Refund 退款模块 service 层
 *
 * 后端：POST /api/v1/client/refunds（整单 + items[] 部分退款，refund.controller.ts）
 * reason enum 8 值（packages/api-contract/src/schemas/refund.ts:25-34）
 * 部分退款支持（refund.service.ts:130-175 金额分叉 + P1 累计校验 + E-REFUND-00* 错误码段）
 *
 * 注：openapi.yaml 仍是旧 6 值 enum（gen:openapi 未重新跑），运行时后端 src 已 8 值，
 *     real 模式提交 EXPIRED/SHORTAGE 不会 400（用户 2026-08-08 拍板核实）
 */

// 后端 RefundReason enum（8 值，refund.controller.ts:41-50 同步）
export const REFUND_REASONS = [
  'OUT_OF_STOCK',
  'EXPIRED',
  'QUALITY_ISSUE',
  'WRONG_ITEM',
  'SHORTAGE',
  'DELIVERY_TOO_SLOW',
  'CUSTOMER_CHANGE_MIND',
  'OTHER',
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

/**
 * 前端 i18n key → 后端 reason enum 映射（提交时转，参考 orders.ts legacyStatusMap 模式）
 * 后端 src 已扩展 EXPIRED/SHORTAGE（P13 新增），openapi.yaml 待后端 gen:openapi 同步
 */
export const REASON_KEY_TO_ENUM: Record<string, RefundReason> = {
  'afterSales.reasons.expired': 'EXPIRED',
  'afterSales.reasons.damaged': 'QUALITY_ISSUE',
  'afterSales.reasons.wrongItem': 'WRONG_ITEM',
  'afterSales.reasons.shortage': 'SHORTAGE',
  'afterSales.reasons.quality': 'QUALITY_ISSUE',
};

// 部分退款商品项（Commit 8 多商品用，orderItemId = OrderItem.id 非 skuId，transformOrderItem 已映射 raw.id）
export interface RefundItemInput {
  orderItemId: string;
  refundQty: number;
}

// 创建退款 payload（items 不传 = 整单全额退款，向后兼容；Commit 7 整单 / Commit 8 部分退款共用）
export interface CreateRefundPayload {
  orderId: string;
  reason: RefundReason;
  reasonDetail?: string;
  items?: RefundItemInput[];
}
