/**
 * C-P2-12: isInternetReachable 三态——null（探测中/无法探测）是「未知」按可达处理，不判弱网
 *
 * 覆盖 useNetwork.ts（hook）与 offline/network.ts（listener）两处同口径实现。
 */
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '@/store/appStore';
import { useNetworkQuality } from '@/hooks/useNetwork';
import { initNetworkListener } from '@/services/offline/network';
import { renderHook, act } from '@testing-library/react-native';

type NetState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type?: string;
  details?: { effectiveType?: string };
};

type Listener = (s: NetState) => void;
// jest.setup 的 netinfo mock 不存储回调——本测试自装可发事件的可控 mock
// （factory 禁外引：变量名 mock* 前缀白名单）
const mockListeners = new Set<Listener>();

jest.mock('@react-native-community/netinfo', () => {
  const emit = (s: NetState) => mockListeners.forEach((l) => l(s));
  const addEventListener = (l: Listener) => {
    mockListeners.add(l);
    return () => {
      mockListeners.delete(l);
    };
  };
  const fetch = () =>
    Promise.resolve({ isConnected: true, isInternetReachable: null, type: 'cellular' });
  const mod = { addEventListener, fetch, emit };
  return { __esModule: true, default: mod, ...mod };
});

const emitNetState = (state: NetState) => {
  act(() => {
    (NetInfo as unknown as { emit: (s: NetState) => void }).emit(state);
  });
};

jest.mock('@/services/offline/queue', () => ({
  processQueue: jest.fn().mockResolvedValue({ ok: 0, failed: 0 }),
}));

describe('C-P2-12 isInternetReachable 三态', () => {
  beforeEach(() => {
    mockListeners.clear();
  });

  it('useNetworkQuality：isInternetReachable=null（未知）→ isWeak=false，不误判弱网', () => {
    const { result } = renderHook(() => useNetworkQuality());
    act(() => {
      emitNetState({
        isConnected: true,
        isInternetReachable: null,
        details: { effectiveType: '3g' },
      });
    });
    expect(result.current.isOffline).toBe(false);
    expect(result.current.isWeak).toBe(false); // 关键断言：未知 ≠ 弱网
    expect(result.current.status?.isInternetReachable).toBe(true);
  });

  it('useNetworkQuality：明确 false 才判弱网；isConnected=false 判离线', () => {
    const { result } = renderHook(() => useNetworkQuality());
    act(() => {
      emitNetState({ isConnected: true, isInternetReachable: false });
    });
    expect(result.current.isWeak).toBe(true);

    act(() => {
      emitNetState({ isConnected: false, isInternetReachable: false });
    });
    expect(result.current.isOffline).toBe(true);
  });

  it('offline/network listener：null（未知）写入 store 的 isInternetReachable=true（同口径）', () => {
    const cleanup = initNetworkListener();
    act(() => {
      emitNetState({ isConnected: true, isInternetReachable: null });
    });
    expect(useAppStore.getState().networkStatus.isInternetReachable).toBe(true);
    cleanup();
  });
});
