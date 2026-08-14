/**
 * queryClient 全局 401 查询处理测试（T2-B + 审查 Q2）
 *
 * 验证 handleQueryError（QueryCache + MutationCache 的 onError 配置）的错误分类：
 * - 401 → clearAuth（isAuthenticated 翻 false，后续交给 RootAuthGate 单一 Owner）
 * - 非 401（500 / 网络错误 / 非 axios 结构）→ 不动 auth 状态
 * - 缺口 A：_retry 重发仍 401 的终态 reject → 本回调兜底 clearAuth
 * - Q2：mutation 路径（MutationCache.onError 同接 handleQueryError）同样兜底
 */
import { useAuthStore } from '@/store/authStore';
import { handleQueryError, queryClient } from '../queryClient';

// 模拟 axios error 形状（与 src/utils/error.ts isAxios401 判断一致）
const axiosError = (status: number) => ({ response: { status } });
const networkError = { message: 'Network Error' };

describe('handleQueryError（T2-B 全局 401 分类）', () => {
  beforeEach(() => {
    // 模拟已登录态，观察 clearAuth 是否被触发
    useAuthStore.setState({ accessToken: 'tok', refreshToken: 'ref', isAuthenticated: true });
  });

  it('401 → clearAuth（isAuthenticated 翻 false + token 清空）', () => {
    handleQueryError(axiosError(401));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('500 → 不动 auth 状态', () => {
    handleQueryError(axiosError(500));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('网络错误 / 非 axios 结构 / null → 不动 auth 状态', () => {
    handleQueryError(networkError);
    handleQueryError('string error');
    handleQueryError(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('缺口 A：_retry 重发仍 401（interceptor 直接 reject 不 clearAuth）→ 全局兜底触发', () => {
    // interceptor 对 _retry 请求的 401 直接 reject（api.ts:167 条件含 !original._retry，
    // 不走 refreshAccessToken catch 的 clearAuth 分支），query 收到的 error 仍是 axios 401
    const retriedError = { ...axiosError(401), config: { _retry: true } };
    handleQueryError(retriedError);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('Q2：mutation 路径终态 401 → MutationCache 兜底 clearAuth（全局先跑不抢局部 toast）', async () => {
    // MutationCache.onError 同接 handleQueryError —— addToCart 等 mutation 401 后
    // auth 状态即时翻转，不依赖用户切页触发 query 兜底
    queryClient.getMutationCache().clear();
    const mutation = queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: async () => Promise.reject(axiosError(401)) });
    // execute 对失败的 mutation reject（吞掉，只验证全局 onError 副作用）
    await mutation.execute(undefined).catch(() => undefined);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
