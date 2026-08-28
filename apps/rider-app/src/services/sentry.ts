import * as Sentry from '@sentry/react-native';

// 骑手端 Sentry（批次3 接入）：
// 仅当构建期注入 EXPO_PUBLIC_SENTRY_DSN 且 APP_ENV=production 时启用。
// 本地/开发不注入 DSN → 默认关闭，不打扰开发；生产 EAS 构建由 eas.json env 注入。
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const SENTRY_ENABLED = Boolean(SENTRY_DSN) && process.env.EXPO_PUBLIC_APP_ENV === 'production';

export function initSentry() {
  if (!SENTRY_ENABLED) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'production',
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    attachStacktrace: true,
    // 隐私优先：不自动采集 PII，敏感字段显式脱敏（与 client-app sentry.ts 同策略）
    sendDefaultPii: false,
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
        const url = breadcrumb.data.url as string;
        if (url.includes('/auth/') || url.includes('password')) {
          breadcrumb.data.url = url.replace(/=[^&]*/g, '=***');
        }
      }
      return breadcrumb;
    },
    beforeSend: (event) => {
      if (event.request?.headers?.Authorization) {
        event.request.headers.Authorization = '***';
      }
      if (event.extra?.token) {
        event.extra.token = '***';
      }
      return event;
    },
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_ENABLED) {
    console.warn('[Sentry] captureError (dev mode):', error);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function setUserScope(userId: string | null, extra?: Record<string, unknown>) {
  if (!SENTRY_ENABLED) return;
  if (userId) {
    Sentry.setUser({ id: userId, ...extra });
  } else {
    Sentry.setUser(null);
  }
}
