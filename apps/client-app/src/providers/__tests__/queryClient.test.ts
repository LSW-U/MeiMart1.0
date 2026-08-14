/**
 * queryClient 全局 401 查询处理测试（T2-B）
 *
 * 验证 handleQueryError（QueryCache.onError 配置）的错误分类：
 * - 401 → clearAuth（isAuthenticated 翻 false，后续交给 RootAuthGate 单一 Owner）
 * - 非 401（500 / 网络错误 / 非 axios 结构）→ 不动 auth 状态
 * - 缺口 A：_retry 重发仍 401 的终态 reject → 本回调兜底 clearAuth
 */
import { useAuthStore } from '@/store/authStore';
import { handleQueryError } from '../queryClient';

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
});
