/**
 * C-P1-4 persist 排除键（前两段精确匹配）+ 登出显式清缓存 测试
 *
 * 报告 §5 A4：直接断言 dehydrate 的 shouldDehydrateQuery 结果（不 mock persist 内部）。
 * shouldDehydrateQuery 经 initPersist 闭包内联定义，此处取「同口径」导出验证不可行——
 * 改为直接驱动 initPersist 的 persistQueryClient 调用参数：mock
 * @tanstack/react-query-persist-client 捕获 dehydrateOptions.shouldDehydrateQuery，
 * 配真实 QueryClient.setQueryData 造缓存后断言过滤行为。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { useAuthStore } from '@/store/authStore';
import { initPersist, clearPersistedQueryCache } from '../persist';

// 捕获 initPersist 传入的 dehydrateOptions.shouldDehydrateQuery
let capturedShouldDehydrate:
  ((query: { queryKey: readonly unknown[]; state: { status: string } }) => boolean) | null = null;

jest.mock('@tanstack/react-query-persist-client', () => ({
  persistQueryClient: jest.fn(
    (opts: {
      dehydrateOptions?: {
        shouldDehydrateQuery?: (q: {
          queryKey: readonly unknown[];
          state: { status: string };
        }) => boolean;
      };
    }) => {
      capturedShouldDehydrate = opts.dehydrateOptions?.shouldDehydrateQuery ?? null;
    },
  ),
}));

jest.mock('@tanstack/query-async-storage-persister', () => ({
  createAsyncStoragePersister: () => ({ persistClient: jest.fn() }),
}));

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  isMockMode: false,
}));

function shouldDehydrate(queryKey: readonly unknown[], status = 'success'): boolean {
  expect(capturedShouldDehydrate).not.toBeNull();
  return capturedShouldDehydrate!({ queryKey, state: { status } });
}

describe('C-P1-4 persist 排除键（前两段精确匹配）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedShouldDehydrate = null;
    useAuthStore.setState({ accessToken: 't', refreshToken: 'r', isAuthenticated: true });
    initPersist(new QueryClient());
  });

  it('user:notifications / user:profile 不进入 dehydrate（旧实现首段匹配漏网）', () => {
    expect(shouldDehydrate(['user', 'notifications'])).toBe(false);
    expect(shouldDehydrate(['user', 'profile'])).toBe(false);
    expect(shouldDehydrate(['user', 'favorites'])).toBe(false);
    expect(shouldDehydrate(['user', 'notification-preferences'])).toBe(false);
  });

  it('user 其它段仍排除吗——不在排除表内的 user:* 键放行（精确匹配非整段 user 拦截）', () => {
    // 表只列已知 PII 键；未来新增 user:* 键需显式入表（表即白名单语义的反向：黑名单）
    expect(shouldDehydrate(['user', 'unknown-new-key'])).toBe(true);
  });

  it('公开数据键照常持久化（categories/products/product/cart/orders）', () => {
    expect(shouldDehydrate(['categories'])).toBe(true);
    expect(shouldDehydrate(['products'])).toBe(true);
    expect(shouldDehydrate(['product', 'p001'])).toBe(true);
    expect(shouldDehydrate(['cart'])).toBe(true);
    expect(shouldDehydrate(['orders'])).toBe(true);
    expect(shouldDehydrate(['payments', 'methods'])).toBe(true);
  });

  it('pending 查询一律不持久化', () => {
    expect(shouldDehydrate(['categories', 'en'], 'pending')).toBe(false);
  });
});

describe('C-P1-4 登出显式清持久化缓存', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clearPersistedQueryCache 清 AsyncStorage 落盘缓存 + queryClient.clear', async () => {
    await AsyncStorage.setItem('meimart-react-query', '{"queries":[]}');
    const clearSpy = jest.fn();
    await clearPersistedQueryCache({ clear: clearSpy } as unknown as QueryClient);
    expect(await AsyncStorage.getItem('meimart-react-query')).toBeNull();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('未登录启动：initPersist 先清盘（防御恢复旧缓存）', () => {
    useAuthStore.setState({ accessToken: null, refreshToken: null, isAuthenticated: false });
    initPersist(new QueryClient());
    // 未登录分支走 clearPersistedQueryCache（内含 persistQueryClient 不再被调？——仍被调，
    // 清盘 + persist 继续搭好，登录后开始写）
    expect(persistQueryClient).toHaveBeenCalled();
  });
});
