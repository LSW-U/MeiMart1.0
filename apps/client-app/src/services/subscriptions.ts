/**
 * Subscription Service — 商品订阅 C7 降价 / C8 到货（客户画像批5，2026-10-18）
 *
 * 契约（MeiMart client-subscription.controller.ts，路由 /client/subscriptions，
 * Roles CUSTOMER——必须登录）：
 *   POST   /        { productId, type: 'PRICE_ALERT'|'RESTOCK_ALERT' }（upsert，重订阅恢复 enabled）
 *   GET    /        ?type= 过滤 → { items: SubscriptionItem[] }
 *   DELETE /:id     取消
 *
 * C7 价格快照服务端取（priceAtSub 后端记，不信任客户端价）；C8 无附加参数。
 * mock 模式：本地合成（演示可用；无 UI 状态持久语义，仅返回成功形状）。
 */
import { api, isMockMode } from './api';

/** 与后端 SUBSCRIPTION_TYPES 批5 子集对齐（REPLENISH 批4 存量，本服务不涉） */
export type AlertSubscriptionType = 'PRICE_ALERT' | 'RESTOCK_ALERT';

export interface SubscriptionItem {
  id: string;
  productId: string;
  type: 'REPLENISH' | AlertSubscriptionType;
  cycleDays: number;
  enabled: boolean;
  lastRemindedAt: string | null;
  priceAtSub?: number | null;
  createdAt: string;
  updatedAt: string;
}

export const alertSubscriptionApi = {
  /** 创建/更新订阅（登录门控由调用方 UI 层承担；401 时后端拒，错误冒泡给 toast） */
  async subscribe(productId: string, type: AlertSubscriptionType): Promise<void> {
    if (isMockMode) return;
    await api.post('/client/subscriptions', { productId, type });
  },

  /** 我的订阅（按 type 过滤）→ 供开关按钮回显已订阅态 */
  async listMine(type: AlertSubscriptionType): Promise<SubscriptionItem[]> {
    if (isMockMode) return [];
    const res = await api.get<{ items: SubscriptionItem[] }>('/client/subscriptions', {
      params: { type },
    });
    return res.data.items;
  },

  /** 取消订阅（按 id） */
  async unsubscribe(id: string): Promise<void> {
    if (isMockMode) return;
    await api.delete(`/client/subscriptions/${id}`);
  },
};
