/**
 * useAuthStore.hydrate 单测 —— P6-2 幂等守卫（防 StoreInitializer + index + profile 三处重复调用重复拉 profile）。
 *
 * 覆盖：
 *   - 首次 hydrate：拉 token → 拉 profile → set({ isAuthenticated, rider, hydrated })
 *   - 已 hydrated：直接 return，不重复拉 profile（核心断言，回归保护）
 *   - token 缺失：set({ hydrated:true })，isAuthenticated 仍 false
 *   - 串行二次调：第二次幂等短路，profile 只拉一次
 *
 * mock：
 *   - tokenStorage.get：控有/无 token
 *   - riderApi.getProfile：控 resolve/reject + spy 调用次数
 * zustand store 模块级单例，每个 test 前 reset（避免上个 test 的 hydrated 残留）。
 */
import { useAuthStore } from './useAuthStore';
import { riderApi } from '../services/user';
import { tokenStorage } from '../services/token-storage';

jest.mock('../services/user', () => ({
  riderApi: { getProfile: jest.fn() },
}));

jest.mock('../services/token-storage', () => ({
  tokenStorage: { get: jest.fn(), clear: jest.fn() },
}));

const mockGetToken = tokenStorage.get as jest.Mock;
const mockGetProfile = riderApi.getProfile as jest.Mock;
const mockClear = tokenStorage.clear as jest.Mock;

const fakeProfile = { id: 'r1', name: 'Rider', bondPaid: true } as never;

beforeEach(() => {
  // zustand store 是模块级单例，重置到初始未 hydrate 态
  useAuthStore.setState({ isAuthenticated: false, rider: null, hydrated: false });
  mockGetToken.mockReset();
  mockGetProfile.mockReset();
  mockClear.mockReset();
});

describe('P6-2 hydrate 幂等', () => {
  it('首次 hydrate：拉 profile 填 store，hydrated=true', async () => {
    mockGetToken.mockResolvedValue('tok-1');
    mockGetProfile.mockResolvedValue(fakeProfile);

    await useAuthStore.getState().hydrate();

    expect(mockGetProfile).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().hydrated).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().rider).toBe(fakeProfile);
  });

  it('已 hydrated：直接 return，不重复拉 profile（幂等守卫核心）', async () => {
    // 预置已 hydrated 态（模拟 StoreInitializer 已调过一次）
    useAuthStore.setState({ isAuthenticated: true, rider: fakeProfile, hydrated: true });
    mockGetToken.mockResolvedValue('tok-2');
    mockGetProfile.mockResolvedValue(fakeProfile);

    await useAuthStore.getState().hydrate();

    // 关键断言：hydrate 被调用但 getProfile 未触发（幂等短路）
    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('token 缺失：set hydrated=true，isAuthenticated 保持 false', async () => {
    mockGetToken.mockResolvedValue(null);

    await useAuthStore.getState().hydrate();

    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(useAuthStore.getState().hydrated).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('串行二次调：第二次直接幂等返回，profile 只拉一次', async () => {
    mockGetToken.mockResolvedValue('tok-3');
    mockGetProfile.mockResolvedValue(fakeProfile);

    await useAuthStore.getState().hydrate();
    await useAuthStore.getState().hydrate();

    // 串行场景：首次 setState({hydrated:true}) 完成后，第二次进入直接走幂等守卫 return
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().hydrated).toBe(true);
  });
});
