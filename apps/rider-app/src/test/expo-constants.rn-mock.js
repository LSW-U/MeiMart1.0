/**
 * expo-constants mock（rn project / node 环境用；批3 A10/D12 新增）
 *
 * Why: A10 迁移后 rider 源码读 Constants.expoConfig?.extra（api/ws/sentry 3 文件），
 * rn project（node 环境）无 expo-constants 原生宿主，且真包是 ESM 发布会炸 transform。
 * 桩成 CJS：expoConfig 可控（__setExtra / __resetExtra），默认值模拟「本地开发缺省」
 * （USE_MOCK 缺省 → mock 分支，与真机未配 env 的行为一致）。
 *
 * 配套：src/config/app-config.ts 读取语义 = expoConfig?.extra as ... | undefined。
 */

let extraValue = {
  APP_ENV: 'development',
  API_BASE_URL: '',
  USE_MOCK: '',
  SENTRY_DSN: '',
};

export function __setExtra(extra) {
  extraValue = extra;
}

export function __resetExtra() {
  extraValue = {
    APP_ENV: 'development',
    API_BASE_URL: '',
    USE_MOCK: '',
    SENTRY_DSN: '',
  };
}

export const Constants = {
  get expoConfig() {
    return { extra: extraValue };
  },
};

// app-config.ts 用 `import Constants from 'expo-constants'` 默认导入形态
export default Constants;
