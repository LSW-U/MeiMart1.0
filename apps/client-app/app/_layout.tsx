import { Stack, useSegments, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

function RootAuthGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const qc = useQueryClient();
  const { t } = useTranslation();
  // T2: 区分「首次未登录」（不 toast）vs「登录后失效」（toast「登录已过期」）
  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      prevAuthRef.current = true;
      return;
    }
    // T1-C: 登出/token 失效时清所有 RQ 缓存，避免重新登录后看到旧 401 error 态（覆盖手动登出 + interceptor 自动登出全路径）
    qc.clear();
    const first = segments[0]?.toString() ?? '';
    const protectedGroups = [
      '(main)',
      'order',
      'address',
      'profile',
      'service',
      'coupons',
      'favorites',
    ];
    if (protectedGroups.some((g) => first === g)) {
      // T2: 登录后失效才 toast（首次未登录 prevAuthRef=false 不提示），避免用户从未登录却被 toast 困惑
      if (prevAuthRef.current) {
        toast.info(t('errors.sessionExpired'));
      }
      router.replace('/(auth)/login');
    }
    prevAuthRef.current = false;
  }, [isAuthenticated, segments, qc, t]);

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RootAuthGate />
        <Stack screenOptions={{ headerShown: false }} />
      </AppProviders>
    </ErrorBoundary>
  );
}
