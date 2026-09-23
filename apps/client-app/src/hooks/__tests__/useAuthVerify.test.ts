/**
 * useAuth.verify unified 分流测试（批A2-1）
 *
 * 三分支：LOGIN 存 token 进首页 / REGISTER 暂存 ticket→complete→进首页 / BLOCKED 抛 BlockedError
 * mutation hooks 全 mock（沿用 hooks 测试先例），路由与 store 用 spy 取证
 */
import { renderHook, act } from '@testing-library/react-native';
import { useAuth, BlockedError } from '../useAuth';
import { useSmsChallengeStore } from '@/store/smsChallengeStore';
import { useAuthStore } from '@/store/authStore';

const mockVerifyMutate = jest.fn();
const mockCompleteMutate = jest.fn();
const mockSendMutate = jest.fn();
const mockTokenSet = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('@/services/queries/useAuth', () => ({
  useLoginPassword: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRegister: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSendSmsCode: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSendUnifiedSmsCode: () => ({
    mutateAsync: (...a: unknown[]) => mockSendMutate(...a),
    isPending: false,
  }),
  useFetchCaptcha: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useResetPassword: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useVerifySms: () => ({
    mutateAsync: (...a: unknown[]) => mockVerifyMutate(...a),
    isPending: false,
  }),
  useCompleteRegister: () => ({
    mutateAsync: (...a: unknown[]) => mockCompleteMutate(...a),
    isPending: false,
  }),
}));

jest.mock('@/services/auth', () => ({
  authApi: { logout: jest.fn() },
}));

jest.mock('@/services/api', () => ({
  tokenStorage: {
    get: jest.fn(),
    set: (...args: unknown[]) => mockTokenSet(...args),
    getRefresh: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockRouterReplace(...args) },
}));

describe('useAuth.verify unified 分流', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSmsChallengeStore.getState().clear();
    useAuthStore.getState().clearAuth();
  });

  it('缺 challengeId 直接抛错（未发码就 verify）', async () => {
    const { result } = renderHook(() => useAuth());
    await expect(
      act(async () => {
        await result.current.verify({ phone: '+67077123456', code: '123456' });
      }),
    ).rejects.toThrow('challengeId missing');
    expect(mockVerifyMutate).not.toHaveBeenCalled();
  });

  it('LOGIN：存 token 进首页，不调 complete', async () => {
    useSmsChallengeStore.getState().setChallenge('chal-1');
    mockVerifyMutate.mockResolvedValue({
      action: 'LOGIN',
      accessToken: 'at-1',
      refreshToken: 'rt-1',
    });

    const { result } = renderHook(() => useAuth());
    const res = await act(async () =>
      result.current.verify({ phone: '+67077123456', code: '123456' }),
    );

    expect(res.action).toBe('LOGIN');
    expect(mockVerifyMutate).toHaveBeenCalledWith({
      phone: '+67077123456',
      code: '123456',
      challengeId: 'chal-1',
    });
    expect(mockCompleteMutate).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(mockTokenSet).toHaveBeenCalledWith('at-1', 'rt-1');
    expect(mockRouterReplace).toHaveBeenCalledWith('/(main)/home');
  });

  it('REGISTER：暂存 ticket → complete（agreedToTerms:true）→ 存 token 进首页 → challenge 清空', async () => {
    useSmsChallengeStore.getState().setChallenge('chal-2');
    mockVerifyMutate.mockResolvedValue({
      action: 'REGISTER',
      registrationTicket: 'ticket-abc',
    });
    mockCompleteMutate.mockResolvedValue({
      accessToken: 'at-2',
      refreshToken: 'rt-2',
    });

    const { result } = renderHook(() => useAuth());
    const res = await act(async () =>
      result.current.verify({ phone: '+67077123456', code: '123456' }),
    );

    expect(res.action).toBe('REGISTER');
    expect(mockCompleteMutate).toHaveBeenCalledWith({
      registrationTicket: 'ticket-abc',
      challengeId: 'chal-2',
    });
    expect(useSmsChallengeStore.getState().challengeId).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(mockTokenSet).toHaveBeenCalledWith('at-2', 'rt-2');
    expect(mockRouterReplace).toHaveBeenCalledWith('/(main)/home');
  });

  it('BLOCKED：抛 BlockedError，不存 token 不进首页', async () => {
    useSmsChallengeStore.getState().setChallenge('chal-3');
    mockVerifyMutate.mockResolvedValue({ action: 'BLOCKED' });

    const { result } = renderHook(() => useAuth());
    await expect(
      act(async () => {
        await result.current.verify({ phone: '+67077123456', code: '123456' });
      }),
    ).rejects.toThrow(BlockedError);

    expect(mockCompleteMutate).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockTokenSet).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});

describe('useAuth.sendUnifiedSms', () => {
  it('发码后 challengeId 进 store', async () => {
    mockSendMutate.mockResolvedValue({ challengeId: 'chal-9', expireIn: 300 });
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.sendUnifiedSms('+67077123456');
    });
    expect(useSmsChallengeStore.getState().challengeId).toBe('chal-9');
  });
});
