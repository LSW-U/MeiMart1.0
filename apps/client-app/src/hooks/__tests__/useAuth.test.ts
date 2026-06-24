import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../useAuth';

// Mock 5 个 mutation hooks —— 它们不是 logout 的关注点
jest.mock('@/services/queries/useAuth', () => ({
  useLoginPassword: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useLoginSms: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRegister: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSendSmsCode: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useResetPassword: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// jest.mock factory 不允许引用外部变量，用 mock 前缀让 Babel 视作 lazy reference
const mockLogout = jest.fn();
const mockClearAuth = jest.fn();
const mockSetAuth = jest.fn();
const mockTokenClear = jest.fn();
const mockTokenGetRefresh = jest.fn();
const mockTokenSet = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('@/services/auth', () => ({
  authApi: { logout: (...args: unknown[]) => mockLogout(...args) },
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: (sel: (s: Record<string, unknown>) => unknown) =>
    sel({ setAuth: mockSetAuth, clearAuth: mockClearAuth }),
}));

jest.mock('@/services/api', () => ({
  tokenStorage: {
    get: jest.fn(),
    set: (...args: unknown[]) => mockTokenSet(...args),
    getRefresh: () => mockTokenGetRefresh(),
    clear: () => mockTokenClear(),
  },
}));

jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockRouterReplace(...args) } }));

describe('useAuth.logout', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockClearAuth.mockReset();
    mockTokenClear.mockReset();
    mockTokenGetRefresh.mockReset();
    mockRouterReplace.mockReset();
  });

  it('calls authApi.logout with refreshToken then clears local state', async () => {
    mockTokenGetRefresh.mockResolvedValue('ref-1');
    mockLogout.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });

    expect(mockLogout).toHaveBeenCalledWith('ref-1');
    expect(mockClearAuth).toHaveBeenCalledTimes(1);
    expect(mockTokenClear).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('still clears local state when backend logout throws (network down)', async () => {
    mockTokenGetRefresh.mockResolvedValue('ref-2');
    mockLogout.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });

    expect(mockLogout).toHaveBeenCalledWith('ref-2');
    expect(mockClearAuth).toHaveBeenCalledTimes(1);
    expect(mockTokenClear).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('skips backend call but still clears local when no refreshToken stored', async () => {
    mockTokenGetRefresh.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.logout();
    });

    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockClearAuth).toHaveBeenCalledTimes(1);
    expect(mockTokenClear).toHaveBeenCalledTimes(1);
  });
});
