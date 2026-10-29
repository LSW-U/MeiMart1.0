/**
 * Ticket 工单 hooks（替换品批2 工单化，2026-10-29）
 *
 * - useTickets：我的工单分页列表（useInfiniteQuery 游标，loadMore 拉下一页）
 * - useTicket：工单详情（按 ticketNo 寻址）
 * - useTicketEvents：时间线分页（D16）
 *
 * key 定义集中 @/lib/queryKeys（批1 收编惯例）；用户私有数据未登录不发（C-P2-2 先例）
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ticketApi, type TicketEventRaw, type TicketRaw } from '@/services/tickets';
import { useAuthStore } from '@/store/authStore';
import { TICKETS_QUERY_KEY, ticketDetailKey, ticketEventsKey, STALE_TIME } from '@/lib/queryKeys';

const TICKET_PAGE_SIZE = 20;

/** 我的工单分页列表（profile「我的工单」入口） */
export function useTickets() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: TICKETS_QUERY_KEY,
    queryFn: ({ pageParam }) => ticketApi.listTickets(pageParam, TICKET_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_TIME.tickets,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated,
  });
}

/** 工单列表全量页拼平 */
export function flattenTicketPages(pages: { items: TicketRaw[] }[] | undefined): TicketRaw[] {
  return pages?.flatMap((p) => p.items) ?? [];
}

/** 工单详情（时间线页头 + 状态/时限展示） */
export function useTicket(ticketNo: string | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ticketDetailKey(ticketNo ?? ''),
    queryFn: () => ticketApi.getTicket(ticketNo!),
    enabled: isAuthenticated && !!ticketNo,
    staleTime: STALE_TIME.ticketDetail,
  });
}

/** 时间线分页（D16，asc） */
export function useTicketEvents(ticketNo: string | undefined) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: ticketEventsKey(ticketNo ?? ''),
    queryFn: ({ pageParam }) => ticketApi.listTicketEvents(ticketNo!, pageParam, 50),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isAuthenticated && !!ticketNo,
    staleTime: STALE_TIME.ticketDetail,
  });
}

/** 时间线全量页拼平 */
export function flattenTicketEventPages(
  pages: { items: TicketEventRaw[] }[] | undefined,
): TicketEventRaw[] {
  return pages?.flatMap((p) => p.items) ?? [];
}
