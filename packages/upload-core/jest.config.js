/** upload-core 单测配置（批B，2026-09-09）
 *
 * 纯 TS 无 RN 组件依赖，node 环境足够（fetch/FormData node 18+ 原生可用）；
 * 用 jest-expo preset 保持与两 app 相同的 TS 转译链路（babel-preset-expo）。
 */
module.exports = {
  testEnvironment: 'node',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
};
