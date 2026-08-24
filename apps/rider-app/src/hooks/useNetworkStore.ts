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
 *
 * P6-4 路径 A：首帧 isConnected=null（NetInfo 未确认），与方案 §10「启动时未确认不触发 processQueue」对齐。
 *   消费方按需守卫：
 *   - _layout processQueue：仅 `isOffline === true → false`（明确从断网恢复）才 flush，null 首帧不触发。
 *   - _layout bgEnabled：`isOffline === false`（明确在线）才启后台定位，null 不启（保守不耗电）。
 *   - OfflineBanner：`if (!isOffline)` 中 null 为 falsy → 不显示，语义正确（未确认≠断网，不闪黄条）。
 *   NetInfo 首次回调（fetch/addEventListener）到达后更新为真实 boolean。
 */
type NetworkState = {
  // null = NetInfo 首帧未确认（启动瞬态），boolean = 已确认在线/断网
  isConnected: boolean | null;
  isOffline: boolean | null;
  init: () => () => void;
};

// 模块级单例 state：fetch 与 addEventListener 共用，所有订阅者读同一份。
// activeCount 引用计数：首个订阅者 fetch + addEventListener，最后一个卸载时解注重置。
let unsub: (() => void) | null = null;
let activeCount = 0;

function derive(state: NetInfoState) {
  const connected = state.isConnected ?? true;
  useNetworkStore.setState({
    isConnected: connected,
    isOffline: !connected,
  });
}

export const useNetworkStore = create<NetworkState>(() => ({
  isConnected: null,
  isOffline: null,
  init: () => {
    activeCount += 1;
    // 首个订阅者：fetch 同步拉真实状态 + 注册 addEventListener（NetInfo 内部单例广播，只注一次）
    if (activeCount === 1) {
      NetInfo.fetch().then(derive).catch(() => {
        // fetch 失败保守视为在线（与原 useNetwork ?? true 一致），避免误判断网阻断派单
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
        useNetworkStore.setState({ isConnected: null, isOffline: null });
      }
    };
  },
}));
