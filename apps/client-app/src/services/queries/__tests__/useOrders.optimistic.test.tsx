import { act } from '@testing-library/react-native';
import type { Order } from '@/types';
import { orderApi } from '@/services/orders';
import { ORDERS_QUERY_KEY, useCancelOrder } from '../useOrders';
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
];

function setup(returnAfterCancel: Order[] = baseOrders) {
  // Why: service getOrders 返回 {items, nextCursor, hasMore} 游标分页结构（Phase 3 改造）
  (orderApi.getOrders as jest.Mock).mockResolvedValue({
    items: returnAfterCancel,
    nextCursor: null,
    hasMore: false,
  });
  const qc = createTestQueryClient();
  qc.setQueryData([...ORDERS_QUERY_KEY, 'all'], baseOrders);
  // 各状态变体
  qc.setQueryData(
    [...ORDERS_QUERY_KEY, 'PENDING_PAYMENT'],
    baseOrders.filter((o) => o.status === 'PENDING_PAYMENT'),
  );
  qc.setQueryData(
    [...ORDERS_QUERY_KEY, 'CONFIRMED'],
    baseOrders.filter((o) => o.status === 'CONFIRMED'),
  );
  return qc;
}

describe('useOrders 乐观更新', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useCancelOrder 立即把订单状态改为 cancelled（全变体同步）', async () => {
    (orderApi.cancelOrder as jest.Mock).mockResolvedValue(undefined);
    const cancelled: Order[] = [{ ...baseOrders[0], status: 'CANCELLED' }, baseOrders[1]];
    const qc = setup(cancelled);

    const { result } = renderHookWithClient(() => useCancelOrder(), qc);
    await act(async () => {
      await result.current.mutateAsync('o1');
    });

    const all = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'all']);
    expect(all?.find((o) => o.id === 'o1')?.status).toBe('CANCELLED');

    const pending = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'PENDING_PAYMENT']);
    expect(pending?.find((o) => o.id === 'o1')?.status).toBe('CANCELLED');
  });
});
