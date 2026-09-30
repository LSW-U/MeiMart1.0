/**
 * usePushRegistration 登录/登出边沿测试（C-P3-11 / P3-2 审查修复，任务书第 11 项点名）
 *
 * 覆盖三条边沿：
 * 1. false→true 登录边沿：registerPushToken 被调（token 缓存进会话变量）
 * 2. true→false 登出边沿：deletePushToken 用「注册时缓存的 token」注销（幂等注销链路）
 * 3. 早退（shouldInitPush=false，mock/web）也更新 prevAuthRef——C-P3-11 修复的边沿记账：
 *    早退期间不丢边沿，切 native 后不误判（wasAuth 用最新值）
 *
 * 独立文件原因：jest.mock 文件级——本文件 mock push service 四函数精确断言边沿调用。
 * 模块级 registeredTokenThisSession 跨用例保留：用例按「注册→注销」成对设计，状态自洽。
 */
import { renderHook, act } from '@testing-library/react-native';
import { usePushRegistration } from '../usePushRegistration';

const mockFetchToken = jest.fn();
const mockRegister = jest.fn();
const mockDelete = jest.fn();
const mockShouldInit = jest.fn();

jest.mock('@/services/push', () => ({
  fetchExpoPushToken: (...args: unknown[]) => mockFetchToken(...args),
  registerPushToken: (...args: unknown[]) => mockRegister(...args),
  deletePushToken: (...args: unknown[]) => mockDelete(...args),
  shouldInitPush: (...args: unknown[]) => mockShouldInit(...args),
}));

// authStore 可控注入：每用例用 mockAuthState 切换 isAuthenticated 触发边沿
let mockAuthState = { isAuthenticated: false };
jest.mock('@/store/authStore', () => ({
  useAuthStore: (sel: (s: { isAuthenticated: boolean }) => unknown) => sel(mockAuthState),
}));

describe('usePushRegistration 登录/登出边沿（C-P3-11 / P3-2）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { isAuthenticated: false };
    mockShouldInit.mockReturnValue(true);
  });

  it('false→true 登录边沿：fetchToken + registerPushToken 被调', async () => {
    mockFetchToken.mockResolvedValue('expo-token-1');
    mockRegister.mockResolvedValue(true);
    const { rerender } = renderHook(() => usePushRegistration());
    // 未登录初帧无动作
    expect(mockRegister).not.toHaveBeenCalled();

    // 登录边沿
    mockAuthState = { isAuthenticated: true };
    await act(async () => {
      rerender(undefined);
      // 注册是 async IIFE，等 microtask 消化
      await Promise.resolve();
    });
    expect(mockFetchToken).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledWith('expo-token-1');
  });

  it('true→false 登出边沿：用会话缓存 token 调 deletePushToken', async () => {
    mockFetchToken.mockResolvedValue('expo-token-1');
    mockRegister.mockResolvedValue(true);
    const { rerender } = renderHook(() => usePushRegistration());
    mockAuthState = { isAuthenticated: true };
    await act(async () => {
      rerender(undefined);
      await Promise.resolve();
    });
    expect(mockRegister).toHaveBeenCalledWith('expo-token-1');

    // 登出边沿
    mockAuthState = { isAuthenticated: false };
    await act(async () => {
      rerender(undefined);
      await Promise.resolve();
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('expo-token-1');

    // 再次登出（无新注册）→ 无 token 可删，不再调 delete
    mockAuthState = { isAuthenticated: true };
    await act(async () => {
      rerender(undefined);
      await Promise.resolve();
    });
    mockAuthState = { isAuthenticated: false };
    await act(async () => {
      rerender(undefined);
      await Promise.resolve();
    });
    // register 失败时不缓存 token → 登出无 token 可删（此处第二次注册成功，会有 delete）
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  it('shouldInitPush=false（mock/web）早退也更新 prevAuthRef：恢复 true 后按最新 wasAuth 判边沿（C-P3-11）', async () => {
    // 初帧 mock 模式早退
    mockShouldInit.mockReturnValue(false);
    const { rerender } = renderHook(() => usePushRegistration());
    expect(mockFetchToken).not.toHaveBeenCalled();

    // 早退期间登录态翻转（mock 登录）——早退也要记账 prevAuthRef
    mockAuthState = { isAuthenticated: true };
    await act(async () => {
      rerender(undefined);
      await Promise.resolve();
    });
    expect(mockFetchToken).not.toHaveBeenCalled(); // 仍早退不注册

    // 切 native（shouldInitPush=true）：此时 isAuthenticated 已是 true、
    // wasAuth（prevAuthRef）也已被早退路径更新为 true → 非边沿，不重复注册；
    // 但若修复缺失（早退不记账），wasAuth 停在 false 会误触发注册——用「登出再登录」验证边沿仍可达
    mockShouldInit.mockReturnValue(true);
    await act(async () => {
      rerender(undefined);
      await Promise.resolve();
    });
    // wasAuth 已记账为 true → 非 false→true 边沿，不注册（C-P3-11 修复语义）
    expect(mockFetchToken).not.toHaveBeenCalled();

    // 真登出→登录边沿在 native 模式下正常注册
    mockAuthState = { isAuthenticated: false };
    await act(async () => {
      rerender(undefined);
      await Promise.resolve();
    });
    mockAuthState = { isAuthenticated: true };
    mockFetchToken.mockResolvedValue('expo-token-2');
    mockRegister.mockResolvedValue(true);
    await act(async () => {
      rerender(undefined);
      await Promise.resolve();
    });
    expect(mockRegister).toHaveBeenCalledWith('expo-token-2');
  });
});
