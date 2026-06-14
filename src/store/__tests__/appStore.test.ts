import { useAppStore } from '../appStore';

describe('appStore', () => {
  it('starts with default locale zh', () => {
    expect(useAppStore.getState().locale).toBe('zh');
  });

  it('setLocale updates locale', () => {
    useAppStore.getState().setLocale('en');
    expect(useAppStore.getState().locale).toBe('en');
    useAppStore.getState().setLocale('zh');
  });

  it('setThemeMode updates theme', () => {
    useAppStore.getState().setThemeMode('dark');
    expect(useAppStore.getState().themeMode).toBe('dark');
    useAppStore.getState().setThemeMode('system');
  });

  it('setNetworkStatus updates status', () => {
    const status = {
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
      effectiveType: 'slow' as const,
    };
    useAppStore.getState().setNetworkStatus(status);
    expect(useAppStore.getState().networkStatus).toEqual(status);
  });

  it('setOnboardingCompleted toggles flag', () => {
    useAppStore.getState().setOnboardingCompleted(true);
    expect(useAppStore.getState().onboardingCompleted).toBe(true);
    useAppStore.getState().setOnboardingCompleted(false);
  });

  it('setPendingMutations tracks queue size', () => {
    useAppStore.getState().setPendingMutations(5);
    expect(useAppStore.getState().pendingMutations).toBe(5);
    useAppStore.getState().setPendingMutations(0);
  });
});
