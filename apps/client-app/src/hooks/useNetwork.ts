import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore, type NetworkStatus } from '@/store/appStore';

export interface NetworkQuality {
  isOffline: boolean;
  isWeak: boolean;
  isSlow: boolean;
  status: NetworkStatus | null;
}

/**
 * C-P2-12: isInternetReachable 三态语义——null（探测未完成/无法探测，如蜂窝受限网络）
 * 是「未知」，不是「不可达」。Boolean() 把 null 折叠成 false 会让启动瞬间/探测中误判弱网，
 * 触发降级 UI（低清图/关动画）。这里未知按「可达」处理（isWeak=false），isConnected 仍为
 * 硬判据（false 即离线）。
 */
function reachableOrUnknown(value: boolean | null | undefined): boolean {
  return value !== false;
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
      const isInternetReachable = reachableOrUnknown(state.isInternetReachable);
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
