import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

/**
 * P6-5（Q3=B）：网络状态单例 store。
 *
 * Why：原 useNetwork 是 per-hook useState，10 处调用各起一份 NetInfo 订阅 + 各存一份 state。
 *   - _layout 与 OfflineBanner 各调一次 useNetwork，首帧 isConnected=null 经 ?? true 收敛为 isOffline=false，
 *     两处可能瞬时不一致（fetch 回调先后到达）→ OfflineBanner 闪/不闪与 _layout 判定错位。
 *   - 10 份 addEventListener 订阅是净浪费（NetInfo 内部已是单例广播，但 hook 层 state 各存一份）。
 *
 * Scope（Q3=B，仅关键 2 处切单例）：仅 _layout MainContent + OfflineBanner 切到本 store，
 *   其余 8 处（tasks/earnings/checkout/... 的下拉刷新守卫）保留原 useNetwork，本批不动。
 *   单例的价值在「同一屏的 _layout 与 OfflineBanner 共享同一份状态」，2 处即达成目标。
 *
 * init() 在 root _layout 注册一次（app 生命周期内 root 不卸载，等同常驻），返回 cleanup 解注。
 * 首帧 isConnected 默认 true（与原 useNetwork `?? true` 收敛一致），NetInfo 首次回调到达后更新真实状态。
 */
type NetworkState = {
  isConnected: boolean;
  isOffline: boolean;
  init: () => () => void;
};

// 模块级单例 state：fetch 与 addEventListener 共用，所有订阅者读同一份。
// activeCount 引用计数：首个订阅者 fetch + addEventListener，最后一个卸载时解注重置。
let unsub: (() => void) | null = null;
let activeCount = 0;

function derive(state: NetInfoState) {
  useNetworkStore.setState({
    isConnected: state.isConnected ?? true,
    isOffline: !(state.isConnected ?? true),
  });
}

export const useNetworkStore = create<NetworkState>(() => ({
  isConnected: true,
  isOffline: false,
  init: () => {
    activeCount += 1;
    // 首个订阅者：fetch 同步拉真实状态 + 注册 addEventListener（NetInfo 内部单例广播，只注一次）
    if (activeCount === 1) {
      NetInfo.fetch().then(derive).catch(() => {
        useNetworkStore.setState({ isConnected: true, isOffline: false });
      });
      unsub = NetInfo.addEventListener(derive);
    }
    return () => {
      activeCount -= 1;
      // 最后一个订阅者卸载：解除 NetInfo 订阅，重置默认态供下次 init
      if (activeCount === 0 && unsub) {
        unsub();
        unsub = null;
        useNetworkStore.setState({ isConnected: true, isOffline: false });
      }
    };
  },
}));
