/** Jest 配置（CLAUDE.md P1 测试基建）
 *
 * preset: jest-expo 自动接管 RN/Expo transform + mock（react-native、expo-* 等），
 *         复用 babel.config.js（含 nativewind/babel），className 在测试里也能渲染。
 * moduleNameMapper: 对齐 tsconfig `@/*` → 项目根，避免 import '@/src/...' 在测试里报错。
 * transformIgnorePatterns: RN/Expo 生态包以 ESM 发布，必须 transform 才能跑（jest-expo 默认已覆盖，
 *                          这里显式列一遍 + nativewind，方便后续加包时改一处。
 */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|nativewind|react-native-svg)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
