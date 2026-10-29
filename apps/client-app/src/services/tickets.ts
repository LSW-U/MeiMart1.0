/**
 * Ticket 工单模块 service 层（替换品批2 工单化，2026-10-29）
 *
 * 后端：GET /api/v1/client/tickets（列表游标分页）/ /:ticketNo（详情）/ /:ticketNo/events（时间线）
 * ticketNo 是用户侧业务键（TK + yyyyMMdd + 6 位序号），端点按 ticketNo 寻址非 id
 *
 * 建单走骑手 reportIssue 旁路（D20），客户端批2 只有查询三端点
 */
import { api, isMockMode } from './api';
import { mockResponse } from './mockDb';

/** 后端工单类型（D15：reportIssue 五枚举 + FEEDBACK 预留） */
export const TICKET_TYPES = [
  'CUSTOMER_UNREACHABLE',
  'CUSTOMER_REJECTED',
  'ADDRESS_NOT_FOUND',
  'TRAFFIC_ACCIDENT',
  'OTHER',
  'FEEDBACK',
] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** 后端 TicketView（ticket.service.ts toView 对齐） */
export interface TicketRaw {
  id: string;
  ticketNo: string;
  status: TicketStatus;
  type: TicketType;
  sourceType: string;
  sourceId: string;
  firstRespDue: string | null;
  resolveDue: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 后端 TicketEventView（时间线事件） */
export interface TicketEventRaw {
  id: string;
  ticketId: string;
  eventType: string;
  operatorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  operatorId: string | null;
  note: string | null;
  createdAt: string;
}

/** 游标分页包（PaginatedResponse，api interceptor 已剥 {success,data} 壳） */
export interface TicketPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const ticketApi = {
  /** 我的工单分页列表（游标） */
  async listTickets(cursor?: string, limit?: number): Promise<TicketPage<TicketRaw>> {
    if (isMockMode) {
      // mock：返空（用户无工单记录，展示空态）。real 模式 GET /client/tickets 返 TicketPage
      return mockResponse({ items: [], nextCursor: null, hasMore: false });
    }
    const res = await api.get<TicketPage<TicketRaw>>('/client/tickets', {
      params: { ...(cursor ? { cursor } : {}), ...(limit ? { limit } : {}) },
    });
    return res.data;
  },

  /** 工单详情（按 ticketNo 寻址；非本人 404） */
  async getTicket(ticketNo: string): Promise<TicketRaw> {
    if (isMockMode) {
      return mockResponse({
        id: `mock-${ticketNo}`,
        ticketNo,
        status: 'OPEN',
        type: 'OTHER',
        sourceType: 'DELIVERY_ISSUE',
        sourceId: 'mock-task',
        firstRespDue: null,
        resolveDue: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    const res = await api.get<TicketRaw>(`/client/tickets/${encodeURIComponent(ticketNo)}`);
    return res.data;
  },

  /** 时间线分页（D16，按 createdAt asc） */
  async listTicketEvents(
    ticketNo: string,
    cursor?: string,
    limit?: number,
  ): Promise<TicketPage<TicketEventRaw>> {
    if (isMockMode) {
      return mockResponse({ items: [], nextCursor: null, hasMore: false });
    }
    const res = await api.get<TicketPage<TicketEventRaw>>(
      `/client/tickets/${encodeURIComponent(ticketNo)}/events`,
      { params: { ...(cursor ? { cursor } : {}), ...(limit ? { limit } : {}) } },
    );
    return res.data;
  },
};
