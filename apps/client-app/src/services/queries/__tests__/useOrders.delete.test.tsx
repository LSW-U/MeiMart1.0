/**
 * useDeleteOrders 乐观删除测试（批3 #5 订单删除，C3）
 *
 * 覆盖：列表（all + 各 status 变体）filter 移除、counts 按被删订单状态 -1（同组多单累计减）、
 * 失败 rollback（snapshot 全还原）、onSettled invalidate 前缀校准。
 */
import { act, waitFor } from '@testing-library/react-native';
import type { Order } from '@/types';
import { orderApi } from '@/services/orders';
import { ORDERS_QUERY_KEY, useDeleteOrders } from '../useOrders';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/orders');

const baseOrders: Order[] = [
  {
    id: 'o1',
    orderNo: 'ORD-001',
    status: 'PENDING_PAYMENT',
    items: [],
    totalPrice: 100,
    createdAt: '2026-06-01',
  },
  {
    id: 'o2',
    orderNo: 'ORD-002',
    status: 'CONFIRMED',
    items: [],
    totalPrice: 200,
    createdAt: '2026-06-02',
  },
  {
    id: 'o3',
    orderNo: 'ORD-003',
    status: 'PENDING_PAYMENT',
    items: [],
    totalPrice: 300,
    createdAt: '2026-06-03',
  },
];

// counts 以 OrderStatus 为键（useOrderCounts 聚合成组角标）
const baseCounts = { PENDING_PAYMENT: 2, CONFIRMED: 1, CANCELLED: 0 };

function setup() {
  (orderApi.getOrders as jest.Mock).mockResolvedValue({
    items: baseOrders,
    nextCursor: null,
    hasMore: false,
  });
  const qc = createTestQueryClient();
  qc.setQueryData([...ORDERS_QUERY_KEY, 'all'], baseOrders);
  qc.setQueryData(
    [...ORDERS_QUERY_KEY, 'PENDING_PAYMENT'],
    baseOrders.filter((o) => o.status === 'PENDING_PAYMENT'),
  );
  qc.setQueryData(
    [...ORDERS_QUERY_KEY, 'CONFIRMED'],
    baseOrders.filter((o) => o.status === 'CONFIRMED'),
  );
  qc.setQueryData([...ORDERS_QUERY_KEY, 'counts'], { ...baseCounts });
  return qc;
}

describe('useDeleteOrders 乐观删除（批3 C3）', () => {
  beforeEach(() => jest.clearAllMocks());

  it('乐观删除：all + status 变体列表移除；counts 按被删订单状态 -1（同组累计减）', async () => {
    (orderApi.deleteOrders as jest.Mock).mockResolvedValue({ success: true });
    const qc = setup();

    const { result } = renderHookWithClient(() => useDeleteOrders(), qc);
    await act(async () => {
      await result.current.mutateAsync(['o1', 'o3']); // 两条 PENDING_PAYMENT
    });

    const all = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'all'])!;
    expect(all.map((o) => o.id)).toEqual(['o2']);
    const pending = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'PENDING_PAYMENT'])!;
    expect(pending).toHaveLength(0);
    // CONFIRMED 列表不受影响
    const confirmed = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'CONFIRMED'])!;
    expect(confirmed.map((o) => o.id)).toEqual(['o2']);
    // counts：PENDING_PAYMENT 2-2=0；CONFIRMED 不动
    const counts = qc.getQueryData<Record<string, number>>([...ORDERS_QUERY_KEY, 'counts'])!;
    expect(counts.PENDING_PAYMENT).toBe(0);
    expect(counts.CONFIRMED).toBe(1);
  });

  it('服务端失败时 rollback（列表 + counts 全还原）', async () => {
    (orderApi.deleteOrders as jest.Mock).mockRejectedValue(new Error('network'));
    const qc = setup();

    const { result } = renderHookWithClient(() => useDeleteOrders(), qc);
    await act(async () => {
      try {
        await result.current.mutateAsync(['o1']);
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      const all = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'all'])!;
      expect(all).toHaveLength(3);
    });
    const pending = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'PENDING_PAYMENT'])!;
    expect(pending).toHaveLength(2);
    const counts = qc.getQueryData<Record<string, number>>([...ORDERS_QUERY_KEY, 'counts'])!;
    expect(counts.PENDING_PAYMENT).toBe(2);
  });

  it('onSettled invalidate 前缀（含 counts）校准服务端真值', async () => {
    (orderApi.deleteOrders as jest.Mock).mockResolvedValue({ success: true });
    const qc = setup();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = renderHookWithClient(() => useDeleteOrders(), qc);
    await act(async () => {
      await result.current.mutateAsync(['o2']);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] });
    });
  });

  it('单条删除：all 列表移除、对应 status 变体同步移除、counts -1', async () => {
    (orderApi.deleteOrders as jest.Mock).mockResolvedValue({ success: true });
    const qc = setup();

    const { result } = renderHookWithClient(() => useDeleteOrders(), qc);
    await act(async () => {
      await result.current.mutateAsync(['o2']);
    });

    const all = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'all'])!;
    expect(all.map((o) => o.id)).toEqual(['o1', 'o3']);
    const confirmed = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'CONFIRMED'])!;
    expect(confirmed).toHaveLength(0);
    const counts = qc.getQueryData<Record<string, number>>([...ORDERS_QUERY_KEY, 'counts'])!;
    expect(counts.CONFIRMED).toBe(0);
  });
});
