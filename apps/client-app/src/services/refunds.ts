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

import { api, isMockMode } from './api';
import type { LocalizableText } from '@/types';

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
// P13 B2: photos 凭证照片 URL 数组（client upload 端点返回，后端 isOwnUrl 校验 + max 9，前端限 3）
export interface CreateRefundPayload {
  orderId: string;
  reason: RefundReason;
  reasonDetail?: string;
  items?: RefundItemInput[];
  photos?: string[];
}

/**
 * 后端 RefundItemView（refund.service.ts:35-44）
 * productName 是多语言对象（Record<string,string>，同 Product.name），前端用 localize() 转
 */
export interface RefundItemViewRaw {
  id: string;
  refundId: string;
  orderItemId: string;
  skuId: string;
  productName: LocalizableText; // 后端 Record<string,string>，实际从 product.name 复制（en/zh/tet 完整，类型层对齐 Product.name）
  unitPrice: number; // 分
  refundQty: number;
  subtotal: number; // 分
}

// 后端 Refund 视图（POST /client/refunds 返回 data + GET /client/refunds/:id 详情）
// 字段对齐后端 RefundView（refund.service.ts:46-64）
export interface RefundRaw {
  id: string;
  orderId: string;
  userId: string;
  amount: number; // 分（实际退款金额，部分退款 = sum(subtotal)，整单 = order.totalPrice）
  reason: string;
  reasonDetail: string | null;
  status: string; // PENDING / APPROVED / COMPLETED / REJECTED / CANCELLED
  transactionId: string | null; // 第三方退款交易号（auto-approve 时有，否则 null）
  refundMethod: string; // COD / STRIPE / BANK（即原 PaymentIntent.method）
  reviewedBy: string | null;
  reviewedAt: string | null; // 审核时间（商家通过/驳回时）
  reviewNote: string | null; // 驳回原因（REJECT 时）
  completedAt: string | null; // 退款完成时间（系统退款成功时）
  createdAt: string;
  updatedAt: string;
  /** 退款商品列表（整单退款时为空数组，需 fallback 到 order.items） */
  items: RefundItemViewRaw[];
  /** 凭证照片 URL 数组（client upload 端点返回，P13 B2；后端 isOwnUrl 校验） */
  photos: string[];
}

export const refundApi = {
  /** 创建退款（整单不传 items / 部分退款传 items[]，向后兼容） */
  async createRefund(payload: CreateRefundPayload): Promise<RefundRaw> {
    if (isMockMode) {
      // mock：返回伪造 refund（P13 用 id 跳 detail + status 展示，amount 不展示故 0）
      const mock: RefundRaw = {
        id: `refund-${Date.now()}`,
        orderId: payload.orderId,
        userId: 'mock-user',
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
      };
      // mock 延迟模拟网络（让 isPending 生效，提交按钮 disable 防 repeated submit）
      return new Promise((resolve) => setTimeout(() => resolve(mock), 300));
    }
    const res = await api.post<{ success: boolean; data: RefundRaw }>('/client/refunds', payload);
    return res.data.data;
  },

  /**
   * 退款详情（P14 主数据源）
   * GET /client/refunds/:id → RefundView（含 items[] + 全部时间戳）
   */
  async getRefundDetail(id: string): Promise<RefundRaw> {
    if (isMockMode) {
      // mock：返回 PENDING 伪造 refund（P14 进入能渲染，时间戳全 null）
      const mock: RefundRaw = {
        id,
        orderId: 'o001', // Q4 修复：真实 mock order id（orders.json），让 P14 副 useOrder 能找到 order.items + image
        userId: 'mock-user',
        amount: 0,
        reason: 'OTHER',
        reasonDetail: null,
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
      };
      return new Promise((resolve) => setTimeout(() => resolve(mock), 200));
    }
    const res = await api.get<{ success: boolean; data: RefundRaw }>(`/client/refunds/${id}`);
    return res.data.data;
  },

  /**
   * 撤回退款申请（P14 取消按钮）
   * POST /client/refunds/:id/cancel → RefundView（status=CANCELLED）
   * 后端仅 PENDING 阶段可取消，其他阶段返回 400（service.ts:405 cancelRefund）
   */
  async cancelRefund(id: string): Promise<RefundRaw> {
    if (isMockMode) {
      const mock: RefundRaw = {
        id,
        orderId: 'o001', // Q4 修复：真实 mock order id（orders.json），让 P14 副 useOrder 能找到 order.items + image
        userId: 'mock-user',
        amount: 0,
        reason: 'OTHER',
        reasonDetail: null,
        status: 'CANCELLED',
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
      };
      return new Promise((resolve) => setTimeout(() => resolve(mock), 200));
    }
    const res = await api.post<{ success: boolean; data: RefundRaw }>(
      `/client/refunds/${id}/cancel`,
    );
    return res.data.data;
  },
};
