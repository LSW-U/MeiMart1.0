/**
 * expo-constants mock（web project / jsdom 用）
 *
 * Why: 批C C3 push-token.ts 读 Constants.expoConfig.extra.eas.projectId。
 * expo-constants build 是 ESM + requireOptionalNativeModule（jsdom 无宿主），
 * 直接进 transform 链会炸。测试只需要 expoConfig 可控（__setExpoConfig）。
 *
 * 批3 A10/D12：api.ts/ws.ts/sentry.ts 也读 expoConfig.extra 了（env 迁移），
 * 新增 __setExtra / __resetExtra 便捷注入（只换 extra，保留 eas.projectId 默认）。
 * 默认值=「本地开发缺省」语义：USE_MOCK 缺省（''）→ mock 分支，与迁移前
 * process.env 行为一致；页面测试若需 real 分支用 __setExtra 覆写。
 */
let expoConfigValue = {
  extra: {
    APP_ENV: 'development',
    API_BASE_URL: '',
    USE_MOCK: '',
    SENTRY_DSN: '',
    eas: { projectId: 'test-project-id' },
  },
};

export function __setExpoConfig(config) {
  expoConfigValue = config;
}

/** 批3 A10：只覆写 extra 字段（保留/eas.projectId），测试注入 env 用 */
export function __setExtra(extra) {
  expoConfigValue = { ...expoConfigValue, extra: { ...expoConfigValue.extra, ...extra } };
}

/** 批3 A10：恢复「本地开发缺省」extra（USE_MOCK 缺省 → mock） */
export function __resetExtra() {
  expoConfigValue = {
    extra: {
      APP_ENV: 'development',
      API_BASE_URL: '',
      USE_MOCK: '',
      SENTRY_DSN: '',
      eas: { projectId: 'test-project-id' },
    },
  };
}

export const Constants = {
  get expoConfig() {
    return expoConfigValue;
  },
};

// push-token.ts 用 `import Constants from 'expo-constants'` 默认导入形态
export default Constants;
