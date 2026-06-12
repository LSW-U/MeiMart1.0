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
    const unsub = NetInfo.addEventListener(setState);
    return unsub;
  }, []);

  return {
    isConnected: state.isConnected ?? true,
    isOffline: !(state.isConnected ?? true),
  };
}
