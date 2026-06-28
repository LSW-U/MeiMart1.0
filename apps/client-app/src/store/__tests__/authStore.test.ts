import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('setAuth marks authenticated and stores token', () => {
    useAuthStore.getState().setAuth('tok-1', 'ref-1');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('tok-1');
    expect(state.refreshToken).toBe('ref-1');
  });

  it('clearAuth resets all auth state', () => {
    useAuthStore.getState().setAuth('tok-2', 'ref-2');
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('persist partialize only keeps isAuthenticated — token never lands in AsyncStorage', async () => {
    useAuthStore.getState().setAuth('tok-secret', 'ref-secret');
    const persistedRaw = await AsyncStorage.getItem('auth-storage');
    const persisted = JSON.parse(persistedRaw ?? '{}');
    expect(persisted.state.isAuthenticated).toBe(true);
    expect(persisted.state.accessToken).toBeUndefined();
    expect(persisted.state.refreshToken).toBeUndefined();
  });
});
