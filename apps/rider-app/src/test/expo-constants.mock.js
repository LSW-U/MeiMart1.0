/**
 * expo-constants mock（web project / jsdom 用）
 *
 * Why: 批C C3 push-token.ts 读 Constants.expoConfig.extra.eas.projectId。
 * expo-constants build 是 ESM + requireOptionalNativeModule（jsdom 无宿主），
 * 直接进 transform 链会炸。测试只需要 expoConfig 可控（__setExpoConfig）。
 */
let expoConfigValue = { extra: { eas: { projectId: 'test-project-id' } } };

export function __setExpoConfig(config) {
  expoConfigValue = config;
}

export const Constants = {
  get expoConfig() {
    return expoConfigValue;
  },
};

// push-token.ts 用 `import Constants from 'expo-constants'` 默认导入形态
export default Constants;
