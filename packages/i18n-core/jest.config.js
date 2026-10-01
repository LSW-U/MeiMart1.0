/** i18n-core 单测配置（跨端基建统一 批1，2026-10-01）
 *
 * 照抄 upload-core：纯 TS 无 RN 组件依赖，node 环境足够；
 * 用 jest-expo preset 保持与两 app 相同的 TS 转译链路（babel-preset-expo）。
 */
module.exports = {
  testEnvironment: 'node',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
};
