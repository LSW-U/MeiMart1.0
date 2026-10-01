/** nav-core 单测配置（跨端基建统一 批3 A6）
 *
 * 照抄 format：纯 TS 无 RN 依赖，node 环境足够；jest-expo preset 保持同款转译链路。
 */
module.exports = {
  testEnvironment: 'node',
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
};
