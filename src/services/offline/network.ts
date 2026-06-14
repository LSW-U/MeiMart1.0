import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '@/store/appStore';
import { processQueue } from './queue';

let initialized = false;
let wasOffline = false;

export function initNetworkListener() {
  if (initialized) return () => {};
  initialized = true;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = Boolean(state.isConnected);
    const isInternetReachable = Boolean(state.isInternetReachable);
    const details = (state as { details?: { effectiveType?: string } }).details ?? {};
    const effectiveType = ((): 'fast' | 'cellular' | 'slow' => {
      const t = details.effectiveType;
      if (t === '2g' || t === 'slow-2g') return 'slow';
      if (t === '3g' || t === '4g') return 'cellular';
      return 'fast';
    })();

    useAppStore.getState().setNetworkStatus({
      isConnected,
      isInternetReachable,
      type: state.type ?? 'unknown',
      effectiveType,
    });

    if (wasOffline && isConnected) {
      useAppStore.getState().setNetworkRestoredAt(Date.now());
      void processQueue();
    }
    wasOffline = !isConnected;
  });

  return () => {
    initialized = false;
    unsubscribe();
  };
}
