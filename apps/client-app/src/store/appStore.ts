import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  effectiveType: 'fast' | 'cellular' | 'slow';
}

interface AppState {
  locale: string;
  themeMode: 'light' | 'dark' | 'system';
  networkStatus: NetworkStatus;
  pendingMutations: number;
  networkRestoredAt: number | null;
  onboardingCompleted: boolean;
  setLocale: (locale: string) => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  setPendingMutations: (count: number) => void;
  setNetworkRestoredAt: (ts: number | null) => void;
  setOnboardingCompleted: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: 'zh',
      themeMode: 'system',
      networkStatus: {
        isConnected: true,
        isInternetReachable: true,
        type: 'unknown',
        effectiveType: 'fast',
      },
      pendingMutations: 0,
      networkRestoredAt: null,
      onboardingCompleted: false,
      setLocale: (locale) => set({ locale }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setNetworkStatus: (networkStatus) => set({ networkStatus }),
      setPendingMutations: (pendingMutations) => set({ pendingMutations }),
      setNetworkRestoredAt: (networkRestoredAt) => set({ networkRestoredAt }),
      setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        locale: state.locale,
        themeMode: state.themeMode,
        onboardingCompleted: state.onboardingCompleted,
      }),
    },
  ),
);
