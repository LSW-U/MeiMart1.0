import * as Sentry from '@sentry/react-native';

import { redactError } from '../utils/redact';
import { getExtra } from '../config/app-config';

// 骑手端 Sentry（批次3 接入）：
// 仅当构建期注入 SENTRY_DSN 且 APP_ENV=production 时启用。
// 本地/开发不注入 DSN → 默认关闭，不打扰开发；生产 EAS 构建由 eas.json env 注入。
// 批3 A10：env 从 process.env.EXPO_PUBLIC_* 迁 expo-constants extra（APP_ENV 判断语义不搬，只换注入通道）
const extra = getExtra();
const SENTRY_DSN = extra?.SENTRY_DSN ?? '';
const SENTRY_ENABLED = Boolean(SENTRY_DSN) && extra?.APP_ENV === 'production';

export function initSentry() {
  if (!SENTRY_ENABLED) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: extra?.APP_ENV ?? 'production',
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
      // 第四轮修复 P1-4：console 类面包屑 message 脱敏——console.error(e) 整对象
      // 序列化后 Authorization/config.data 会随面包屑上报，只留安全面摘要
      if (breadcrumb.category === 'console' && typeof breadcrumb.message === 'string') {
        breadcrumb.message = redactError(breadcrumb.message);
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
    // D11 批4（R-P1-10）：dev 直印改为脱敏摘要（原整 error 对象含 axios
    // config.headers.Authorization/config.data 落控制台）
    console.warn('[Sentry] captureError (dev mode):', redactError(error));
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
