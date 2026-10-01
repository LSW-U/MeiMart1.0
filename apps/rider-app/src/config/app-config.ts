import Constants from 'expo-constants';

/**
 * RiderAppConfigExtra —— Constants.expoConfig.extra 的权威类型（批3 A10）
 *
 * 背景：rider env 此前直读 process.env.EXPO_PUBLIC_*（6 处 3 文件：
 * api.ts:10,19 / ws.ts:6 / sentry.ts:8,9,15），babel-preset-expo 编译期烘焙，
 * jest 侧被迫维护 expo/virtual/env mock。批3 对齐 client 模式迁 expo-constants
 * extra（app.config.ts 构建时注入），源码统一走本文件 getExtra()。
 *
 * 真值来源：app.config.ts 构建时写入 extra 的字段集（EXPO_PUBLIC_* 映射）。
 * 改这里时同步改 app.config.ts 的 extra 构造块，两侧字段必须一致。
 *
 * mock 判据语义保持（批3 D12）：USE_MOCK 为 'false' 字符串=real，其余（含缺省）=mock。
 */
export type RiderAppConfigExtra = {
  /** 环境（app.config.ts 从 EXPO_PUBLIC_APP_ENV 注入） */
  APP_ENV: 'development' | 'staging' | 'production';
  /** API 基址（EXPO_PUBLIC_API_BASE_URL；漏配时为空串） */
  API_BASE_URL: string;
  /** mock 开关（EXPO_PUBLIC_USE_MOCK，'false' 字符串=real；缺省=mock） */
  USE_MOCK?: string;
  /** Sentry DSN（EXPO_PUBLIC_SENTRY_DSN，空串=禁用） */
  SENTRY_DSN: string;
  /** EAS 构建元数据（app.json extra.eas 透传） */
  eas?: { projectId?: string };
};

/** 类型安全的 extra 读取（消费侧统一用它，禁止再各自 as 断言） */
export function getExtra(): RiderAppConfigExtra | undefined {
  return Constants.expoConfig?.extra as RiderAppConfigExtra | undefined;
}
