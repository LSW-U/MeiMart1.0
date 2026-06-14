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
    status: 'pending',
    items: [],
    totalPrice: 100,
    createdAt: '2026-06-01',
  },
  {
    id: 'o2',
    orderNo: 'ORD-002',
    status: 'paid',
    items: [],
    totalPrice: 200,
    createdAt: '2026-06-02',
  },
];

function setup(returnAfterCancel: Order[] = baseOrders) {
  (orderApi.getOrders as jest.Mock).mockResolvedValue(returnAfterCancel);
  const qc = createTestQueryClient();
  qc.setQueryData(ORDERS_QUERY_KEY, baseOrders);
  // 各状态变体
  qc.setQueryData(
    [...ORDERS_QUERY_KEY, 'pending'],
    baseOrders.filter((o) => o.status === 'pending'),
  );
  qc.setQueryData(
    [...ORDERS_QUERY_KEY, 'paid'],
    baseOrders.filter((o) => o.status === 'paid'),
  );
  return qc;
}

describe('useOrders 乐观更新', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useCancelOrder 立即把订单状态改为 cancelled（全变体同步）', async () => {
    (orderApi.cancelOrder as jest.Mock).mockResolvedValue(undefined);
    const cancelled: Order[] = [{ ...baseOrders[0], status: 'cancelled' }, baseOrders[1]];
    const qc = setup(cancelled);

    const { result } = renderHookWithClient(() => useCancelOrder(), qc);
    await act(async () => {
      await result.current.mutateAsync('o1');
    });

    const all = qc.getQueryData<Order[]>(ORDERS_QUERY_KEY);
    expect(all?.find((o) => o.id === 'o1')?.status).toBe('cancelled');

    const pending = qc.getQueryData<Order[]>([...ORDERS_QUERY_KEY, 'pending']);
    expect(pending?.find((o) => o.id === 'o1')?.status).toBe('cancelled');
  });
});
