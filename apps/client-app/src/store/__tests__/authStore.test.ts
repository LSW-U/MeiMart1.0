import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
// Why: import 虽在 jest.mock 之后书写，ESM 提升后仍先于工厂执行——jest.mock 工厂
// 提升语义保证 mock 先注册（jest 官方惯例，非违规）。
import { clearPersistedQueryCache } from '@/services/offline/persistCacheClear';
import { useAuthStore } from '../authStore';

// 第四轮修复 P1-1（D3）：clearAuth 内直调 clearPersistedQueryCache（7 条登出路径统一收口）。
// persistCacheClear 的实现在 persistCacheClear.test.ts / persist.test.ts 覆盖；本文件补
// 「clearAuth 触发清缓存」的接线断言（V1 的 store 层证据：登出后无残留落盘缓存）。
jest.mock('@/services/offline/persistCacheClear', () => ({
  clearPersistedQueryCache: jest.fn(),
}));

// Why: tokenStorage 走真实现（AsyncStorage mock），setAuth/clearAuth 的持久化行为保留
jest.mock('@/services/api', () => ({
  tokenStorage: {
    set: jest.fn(),
    clear: jest.fn(),
    get: jest.fn(async () => null),
    getRefresh: jest.fn(async () => null),
  },
}));

const mockClearCache = clearPersistedQueryCache as jest.Mock;

describe('authStore', () => {
  beforeEach(() => {
    mockClearCache.mockClear();
    useAuthStore.getState().clearAuth();
  });

  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('setAuth marks authenticated and stores token', () => {
    useAuthStore.getState().setAuth('tok-1', 'ref-1');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('tok-1');
    expect(state.refreshToken).toBe('ref-1');
  });

  it('clearAuth resets all auth state', () => {
    useAuthStore.getState().setAuth('tok-2', 'ref-2');
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  // 第四轮修复 P1-1（D3）：登出统一收口——clearAuth 内直调清持久化缓存，
  // 7 条登出路径（settings×2/index.web/queryClient 401/api 401/useAuth/profile）零改动自动生效
  it('clearAuth 直调 clearPersistedQueryCache（登出清缓存统一收口，P1-1/D3）', () => {
    // Why: beforeEach 的重置 clearAuth 已发 1 次调用，断言本次登出再 +1
    useAuthStore.getState().setAuth('tok-3', 'ref-3');
    useAuthStore.getState().clearAuth();
    expect(mockClearCache).toHaveBeenCalledTimes(2);
  });

  it('setAuth 不触发清缓存（仅登出清，防登录态误清刚写入的数据）', () => {
    // Why: beforeEach 重置已计 1 次登出调用，setAuth 不应追加
    useAuthStore.getState().setAuth('tok-4', 'ref-4');
    expect(mockClearCache).toHaveBeenCalledTimes(1);
  });

  // V1 store 层证据：clearAuth 后 AsyncStorage 无 react-query 落盘残留（实现层由
  // persistCacheClear 真删 key，此处验证 clearAuth → 删除动作的接线不被未来改动破坏）
  it('V1：clearAuth 后 AsyncStorage 无 meimart-react-query 残留', async () => {
    mockClearCache.mockImplementation(async (client?: QueryClient) => {
      client?.clear();
      await AsyncStorage.removeItem('meimart-react-query');
    });
    await AsyncStorage.setItem('meimart-react-query', '{"queries":[]}');
    useAuthStore.getState().clearAuth();
    // clearAuth 内 void 调用（不 await）——flush 微任务后断言
    await Promise.resolve();
    await Promise.resolve();
    expect(await AsyncStorage.getItem('meimart-react-query')).toBeNull();
  });

  it('persist 不落任何敏感状态 — token/isAuthenticated 都不进 AsyncStorage', async () => {
    useAuthStore.getState().setAuth('tok-secret', 'ref-secret');
    const persistedRaw = await AsyncStorage.getItem('auth-storage');
    const persisted = JSON.parse(persistedRaw ?? '{}');
    // Why: partialize:()=>({}) 刻意不持久化；token 唯一来源是 tokenStorage（SecureStore），
    // isAuthenticated 在 initFromStorage 启动时从 tokenStorage 动态计算，不进 store
    expect(persisted.state?.accessToken).toBeUndefined();
    expect(persisted.state?.refreshToken).toBeUndefined();
    expect(persisted.state?.isAuthenticated).toBeUndefined();
  });
});
