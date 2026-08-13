import NetInfo, { NetInfoStateType, type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

const initialState: NetInfoState = {
  type: NetInfoStateType.unknown,
  isConnected: null,
  isInternetReachable: null,
  details: null,
  isWifiEnabled: false,
};

export function useNetwork() {
  const [state, setState] = useState<NetInfoState>(initialState);

  useEffect(() => {
    // 审查 B1：首次同步拉真实状态，消除 isConnected=null 窗口期（离线保护地基）。
    // addEventListener 订阅时不立即触发，NetInfo 首次回调前 state=null，fallback ?? true 会误判在线，
    // 导致首屏离线保护失效（accept 放行 / 该入队走真 API / _layout 误触发 processQueue）。
    NetInfo.fetch().then(setState).catch(() => setState(initialState));
    const unsub = NetInfo.addEventListener(setState);
    return unsub;
  }, []);

  return {
    isConnected: state.isConnected ?? true,
    isOffline: !(state.isConnected ?? true),
  };
}
