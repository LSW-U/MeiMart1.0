import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.config.ts —— 让 extra 在构建时从 EXPO_PUBLIC_* 环境变量注入（M0-1.4）
 *
 * 背景：client 代码读 Constants.expoConfig?.extra（src/config/env.ts、src/services/api.ts 等），
 * 但 .env 的 key 此前没加 EXPO_PUBLIC_ 前缀，Expo 不会注入 → env 管道是断的。
 * 现在 .env / .env.staging / .env.production 全部改为 EXPO_PUBLIC_* key，
 * 本文件在 Expo 读取配置时（CLI start / EAS build / expo export）把 process.env.EXPO_PUBLIC_*
 * 映射回 extra.*，src 层继续读 extra，无需改动。
 *
 * 优先级：process.env（EXPO_PUBLIC_*，含 EAS 构建注入的 secrets）> app.json 里已有值 > 兜底默认。
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const prev = config.extra ?? {};
  return {
    ...config,
    extra: {
      ...prev,
      APP_ENV: process.env.EXPO_PUBLIC_APP_ENV ?? prev.APP_ENV ?? 'development',
      API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? prev.API_BASE_URL ?? '',
      USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK ?? prev.USE_MOCK ?? 'false',
      SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? prev.SENTRY_DSN ?? '',
    },
  };
};
