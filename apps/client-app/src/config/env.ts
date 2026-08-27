import { getExtra, type AppConfigExtra } from './app-config';

/**
 * env 便捷层 —— 只暴露环境判断常用的三字段（审查批次一 P2-2 修复：
 * 改用 AppConfigExtra 权威类型的 Pick，不再本地 as 断言）。
 * 需要 USE_MOCK 等全字段的消费方直接 import { getExtra } from './app-config'。
 */
type Env = Pick<AppConfigExtra, 'APP_ENV' | 'API_BASE_URL' | 'SENTRY_DSN'>;

const env: Env =
  getExtra() ?? { APP_ENV: 'development', API_BASE_URL: '', SENTRY_DSN: '' };

export const isDev = env.APP_ENV === 'development';
export const isStaging = env.APP_ENV === 'staging';
export const isProd = env.APP_ENV === 'production';
export default env;
