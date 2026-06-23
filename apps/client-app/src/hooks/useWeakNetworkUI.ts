import { useNetworkQuality } from './useNetwork';

export interface WeakNetworkUI {
  isOffline: boolean;
  isWeak: boolean;
  isSlow: boolean;
  shouldSkipNonEssential: boolean;
  shouldUseLowResImage: boolean;
  shouldDisableAnimation: boolean;
}

export function useWeakNetworkUI(): WeakNetworkUI {
  const { isOffline, isWeak, isSlow } = useNetworkQuality();
  const shouldSkipNonEssential = isOffline || isWeak || isSlow;
  return {
    isOffline,
    isWeak,
    isSlow,
    shouldSkipNonEssential,
    shouldUseLowResImage: isWeak || isSlow,
    shouldDisableAnimation: isOffline || isSlow,
  };
}
