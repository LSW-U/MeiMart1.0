import { act } from '@testing-library/react-native';
import type { RefundRaw } from '@/services/refunds';
import { refundApi } from '@/services/refunds';
import { REFUNDS_QUERY_KEY, useCreateRefund } from '../useRefunds';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

// Why: 保留 refunds.ts 的 const/类型，只 mock refundApi.createRefund（避免真实 api.post）
jest.mock('@/services/refunds', () => ({
  ...jest.requireActual('@/services/refunds'),
  refundApi: { createRefund: jest.fn() },
}));

const mockRefund: RefundRaw = {
  id: 'r1',
  orderId: 'o1',
  userId: 'u1',
  amount: 1000,
  reason: 'EXPIRED',
  reasonDetail: 'spoiled',
  status: 'PENDING',
  transactionId: null,
  refundMethod: 'COD',
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  completedAt: null,
  createdAt: '2026-08-10T00:00:00Z',
  updatedAt: '2026-08-10T00:00:00Z',
  items: [],
  photos: [],
};

describe('useCreateRefund', () => {
  // Why: onMutate 前置 optimistic PENDING 项（规则 25 三件套），用户返回列表立即看到新申请
  it('optimistically adds PENDING refund on mutate (onMutate)', async () => {
    (refundApi.createRefund as jest.Mock).mockResolvedValue(mockRefund);
    const client = createTestQueryClient();
    client.setQueryData<RefundRaw[]>(REFUNDS_QUERY_KEY, []);
    const { result } = renderHookWithClient(() => useCreateRefund(), client);

    await act(async () => {
      await result.current.mutateAsync({
        orderId: 'o1',
        reason: 'EXPIRED',
        reasonDetail: 'spoiled',
        items: [{ orderItemId: 'oi1', refundQty: 1 }],
      });
    });

    const data = client.getQueryData<RefundRaw[]>(REFUNDS_QUERY_KEY);
    expect(data).toHaveLength(1);
    expect(data![0].reason).toBe('EXPIRED');
    expect(data![0].orderId).toBe('o1');
    expect(data![0].status).toBe('PENDING');
  });

  // Why: onError rollback 到 previous，避免乐观更新残留失败项
  it('rolls back optimistic item on error (onError)', async () => {
    (refundApi.createRefund as jest.Mock).mockRejectedValue(new Error('E-REFUND-002'));
    const client = createTestQueryClient();
    client.setQueryData<RefundRaw[]>(REFUNDS_QUERY_KEY, []); // previous = []
    const { result } = renderHookWithClient(() => useCreateRefund(), client);

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          orderId: 'o1',
          reason: 'EXPIRED',
        });
      }),
    ).rejects.toThrow('E-REFUND-002');

    // onError rollback：onMutate 前置的 optimistic 项被清，恢复 previous（[]）
    const data = client.getQueryData<RefundRaw[]>(REFUNDS_QUERY_KEY);
    expect(data).toEqual([]);
  });
});
