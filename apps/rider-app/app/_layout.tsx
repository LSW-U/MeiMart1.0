import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setOnUnauthorized } from '../src/services/api';
import { AppProviders } from '../src/providers/AppProviders';
import { useAuth } from '../src/hooks/useAuth';
import { ToastHost } from '../src/components/feedback/Toast';
import { useAuthStore } from '../src/store/useAuthStore';
import { useNetworkStore } from '../src/hooks/useNetworkStore';
import { registerPushToken, unregisterPushToken } from '../src/services/push-token';
import { usePushDeepLink } from '../src/services/push-deep-link';

function PushTokenRegistrar() {
  // 批C C3：登录态驱动 token 注册/注销（真机跳过条件在 push-token.ts 内守卫）
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) {
      void registerPushToken();
    } else {
      void unregisterPushToken();
    }
  }, [isAuthenticated]);
  return null;
}

function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const { forceLogout } = useAuth();
  // 批C C3：推送点击深链三场景（前台/后台 listener + 冷启动 initial response）
  usePushDeepLink();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 被动登出：refresh 401（凭证彻底失效）时由 axios 拦截器触发，
    // 走 forceLogout 轻量路径（清状态+跳登录），不走 logout mutation
    // （refreshToken 已 401，后端 logout 必然也 401，多余且噪声）。
    setOnUnauthorized(() => {
      void forceLogout();
    });

    // useAuthStore.hydrate 拉 rider profile 填 store（B.2.2 已实现）
    // 其他数据（task lists / orders / earnings / notifications / settings）由各页面 useXxx 自动 fetch
    void useAuthStore.getState().hydrate();

    // P6-5（Q3=B）：网络状态单例订阅——root 处注册一次，_layout MainContent 与 OfflineBanner 共享同一份 state。
    // 返回的 cleanup 在 root 卸载时解注（app 生命周期内 root 不卸载，等同常驻）。
    const unsubscribeNetwork = useNetworkStore.getState().init();
    return () => {
      unsubscribeNetwork();
    };
  }, [forceLogout]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StoreInitializer>
          <PushTokenRegistrar />
          <StatusBar style="dark" />
          <ToastHost />
          <Stack screenOptions={{ headerShown: false }} />
        </StoreInitializer>
      </AppProviders>
    </SafeAreaProvider>
  );
}
