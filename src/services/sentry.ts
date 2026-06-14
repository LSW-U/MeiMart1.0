import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const env = Constants.expoConfig?.extra as {
  APP_ENV: 'development' | 'staging' | 'production';
  SENTRY_DSN: string;
};

const SENTRY_DSN = env?.SENTRY_DSN ?? '';
const SENTRY_ENABLED = Boolean(SENTRY_DSN) && env?.APP_ENV === 'production';

export function initSentry() {
  if (!SENTRY_ENABLED) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env?.APP_ENV,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    attachStacktrace: true,
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

export function addBreadcrumb(
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = 'info',
) {
  if (!SENTRY_ENABLED) return;
  Sentry.addBreadcrumb({ message, category, level });
}
