import Constants from 'expo-constants';

/**
 * AppConfigExtra —— Constants.expoConfig.extra 的权威类型（审查批次一 P2-2）
 *
 * 背景：同一份 extra 此前在 5 处被 `as` 断言为 5 种不同 shape
 * （env.ts 缺 USE_MOCK / tracking.ts 只取 API_BASE_URL / uploads.ts 单字段 /
 *  sentry.ts 双字段 / api.ts 四字段），类型漂移且无同步机制——加新 env 字段
 * 时 5 处不会同步更新，某处漏改就运行时 undefined 静默失败。
 *
 * 真值来源：app.config.ts 构建时写入 extra 的字段集（EXPO_PUBLIC_* 映射）。
 * 改这里时同步改 app.config.ts 的 extra 构造块，两侧字段必须一致。
 */
export type AppConfigExtra = {
  /** 环境（app.config.ts 从 EXPO_PUBLIC_APP_ENV 注入） */
  APP_ENV: 'development' | 'staging' | 'production';
  /** API 基址（EXPO_PUBLIC_API_BASE_URL；漏配时为空串而非 localhost） */
  API_BASE_URL: string;
  /** mock 开关（EXPO_PUBLIC_USE_MOCK，'false' 字符串=real） */
  USE_MOCK?: string;
  /** Sentry DSN（EXPO_PUBLIC_SENTRY_DSN，空串=禁用） */
  SENTRY_DSN: string;
  /** EAS 构建元数据（app.json extra.eas 透传） */
  eas?: { projectId?: string };
};

/** 类型安全的 extra 读取（消费侧统一用它，禁止再各自 as 断言） */
export function getExtra(): AppConfigExtra | undefined {
  return Constants.expoConfig?.extra as AppConfigExtra | undefined;
}
