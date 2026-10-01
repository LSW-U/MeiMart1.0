import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.config.ts —— extra 在构建时从 EXPO_PUBLIC_* 环境变量注入（跨端基建统一 批3 A10）
 *
 * 对齐 client-app/app.config.ts 模式：rider 代码此前直读 process.env.EXPO_PUBLIC_*
 * （babel-preset-expo 编译期烘焙，jest 基建被 expo/virtual/env mock 拖累），
 * 迁移后源码统一读 Constants.expoConfig?.extra（src/config/app-config.ts）。
 *
 * 消费点全集（批3 N3 实测 6 处 3 文件）：api.ts:10,19 / ws.ts:6 / sentry.ts:8,9,15
 * —— 对应字段 API_BASE_URL / USE_MOCK / APP_ENV / SENTRY_DSN。
 *
 * 优先级：process.env（EXPO_PUBLIC_*，含 EAS 构建注入的 secrets）> app.json 里已有值 > 兜底默认。
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  // 静态字段兜底（ExpoConfig 要求 name 等必填；app.json 是 config 的来源，此处兜底防 undefined）
  name: config.name ?? 'Mei Delivery App',
  slug: config.slug ?? 'mei-delivery-app',
  extra: {
    ...(config.extra ?? {}),
    APP_ENV: process.env.EXPO_PUBLIC_APP_ENV ?? config.extra?.APP_ENV ?? 'development',
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? config.extra?.API_BASE_URL ?? '',
    USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK ?? config.extra?.USE_MOCK ?? '',
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? config.extra?.SENTRY_DSN ?? '',
  },
});
