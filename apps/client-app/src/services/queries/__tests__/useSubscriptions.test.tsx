import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import {
  useAlertSubscriptions,
  useToggleAlertSubscription,
} from '@/services/queries/useSubscriptions';
/**
 * useSubscriptions 单测 — 批5 C7/C8（方案v2 §三 批5，2026-10-18）
 *
 * 覆盖：
 *   1. 匿名 enabled=false 不请求（端点 Roles CUSTOMER）
 *   2. 登录拉列表（?type= 透传）
 *   3. toggle：未订阅 → POST subscribe；已订阅 → DELETE unsubscribe
 *   4. onSuccess invalidate ['subscriptions', type] 回显
 */
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();
jest.mock('@/services/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
  isMockMode: false,
}));

const mockIsAuthenticated = { value: false };
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: mockIsAuthenticated.value }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
    }
  >
    {children}
  </QueryClientProvider>
);

describe('useAlertSubscriptions / useToggleAlertSubscription（批5 C7/C8）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.value = true;
    mockApiGet.mockResolvedValue({ data: { items: [] } });
    mockApiPost.mockResolvedValue({ data: {} });
    mockApiDelete.mockResolvedValue({ data: {} });
  });

  it('登录：GET /client/subscriptions?type=PRICE_ALERT 拉列表', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        items: [
          {
            id: 'sub1',
            productId: 'p001',
            type: 'PRICE_ALERT',
            cycleDays: 30,
            enabled: true,
            lastRemindedAt: null,
            priceAtSub: 2590,
            createdAt: '2026-10-18T00:00:00Z',
            updatedAt: '2026-10-18T00:00:00Z',
          },
        ],
      },
    });
    const { result } = renderHook(() => useAlertSubscriptions('PRICE_ALERT'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(mockApiGet).toHaveBeenCalledWith('/client/subscriptions', {
      params: { type: 'PRICE_ALERT' },
    });
  });

  it('匿名：enabled=false 不请求', async () => {
    mockIsAuthenticated.value = false;
    const { result } = renderHook(() => useAlertSubscriptions('RESTOCK_ALERT'), { wrapper });
    // 不 fetch（enabled false），data 恒 undefined
    expect(result.current.data).toBeUndefined();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('toggle：未订阅（subscriptionId null）→ POST subscribe（productId+type）', async () => {
    const { result } = renderHook(() => useToggleAlertSubscription('PRICE_ALERT'), { wrapper });
    result.current.mutate({ productId: 'p001', subscriptionId: null });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPost).toHaveBeenCalledWith('/client/subscriptions', {
      productId: 'p001',
      type: 'PRICE_ALERT',
    });
    expect(mockApiDelete).not.toHaveBeenCalled();
  });

  it('toggle：已订阅 → DELETE unsubscribe（按 id）', async () => {
    const { result } = renderHook(() => useToggleAlertSubscription('RESTOCK_ALERT'), { wrapper });
    result.current.mutate({ productId: 'p001', subscriptionId: 'sub9' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiDelete).toHaveBeenCalledWith('/client/subscriptions/sub9');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('onSuccess invalidate 订阅缓存（回显按钮态）', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    mockIsAuthenticated.value = true;
    const { result } = renderHook(() => useToggleAlertSubscription('PRICE_ALERT'), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    result.current.mutate({ productId: 'p001', subscriptionId: null });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['subscriptions', 'PRICE_ALERT'] }),
    );
  });
});
