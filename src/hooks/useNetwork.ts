import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore, type NetworkStatus } from '@/store/appStore';

export interface NetworkQuality {
  isOffline: boolean;
  isWeak: boolean;
  isSlow: boolean;
  status: NetworkStatus | null;
}

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>({
    isOffline: false,
    isWeak: false,
    isSlow: false,
    status: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state.isConnected);
      const isInternetReachable = Boolean(state.isInternetReachable);
      const effectiveType = ((): NetworkStatus['effectiveType'] => {
        const t = (state as { details?: { effectiveType?: string } }).details?.effectiveType;
        if (t === '2g' || t === 'slow-2g') return 'slow';
        if (t === '3g' || t === '4g') return 'cellular';
        return 'fast';
      })();
      const status: NetworkStatus = {
        isConnected,
        isInternetReachable,
        type: state.type ?? 'unknown',
        effectiveType,
      };
      useAppStore.getState().setNetworkStatus(status);
      setQuality({
        isOffline: !isConnected,
        isWeak: isConnected && !isInternetReachable,
        isSlow: effectiveType === 'slow',
        status,
      });
    });
    return () => unsubscribe();
  }, []);

  return quality;
}

export function useNetwork() {
  return useNetworkQuality();
}
