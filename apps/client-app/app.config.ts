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
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? prev.API_BASE_URL ?? '';
  // 本地 http 后端（模拟器经 10.0.2.2 访问 Mac 上的 localhost）需要明文流量开关；
  // https 的 staging/production 不受影响。仅当 API 以 http:// 开头时才加该插件。
  const needsCleartextTraffic = apiBaseUrl.startsWith('http://');
  return {
    ...config,
    extra: {
      ...prev,
      APP_ENV: process.env.EXPO_PUBLIC_APP_ENV ?? prev.APP_ENV ?? 'development',
      API_BASE_URL: apiBaseUrl,
      USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK ?? prev.USE_MOCK ?? 'false',
      SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? prev.SENTRY_DSN ?? '',
    },
    plugins: [
      ...(config.plugins ?? []),
      ...(needsCleartextTraffic
        ? [['expo-build-properties', { android: { usesCleartextTraffic: true } }]]
        : []),
    ],
  };
};
