/** Jest 配置（CLAUDE.md P1 测试基建）
 *
 * 双 project：rn（node 环境 + jest-expo preset，跑现有 service 纯/弱网测试）
 *            + web（jsdom 环境 + @testing-library/react，跑 RQ hooks 测试）。
 *
 * 为何分两 project：jest-expo preset 的 setup（@react-native/jest-preset）假设 node 环境，
 * `Object.defineProperties(global, {...})` 会重定义 jsdom 已锁定的 window 属性 → 报
 * "Cannot redefine property: window"。RQ hooks（useAcceptTask/useStartDelivering）只需
 * QueryClientProvider（纯 React 上下文），不需 RN 渲染器，放 jsdom project 用 web renderHook
 * （同步，避免 TLDRN v14 async renderHook 挂死）。
 *
 * 路由：src/services/queries/** 渲染类测试归 web；其余归 rn。
 */
module.exports = {
  projects: [
    {
      displayName: 'rn',
      testEnvironment: 'node',
      preset: 'jest-expo',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|nativewind|react-native-svg)',
      ],
      // queries 目录的 hooks 测试归 web project（jsdom），rn project 跳过
      testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/src/services/queries/'],
    },
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/services/queries/**/*.test.tsx'],
      // 不复用项目 babel.config.js（含 nativewind/babel，会把 JSX 改写成 nativewind jsx-runtime
      // → 拉入 react-native → jsdom 炸）。用 babel-preset-expo 单 preset（已顶层装、处理 TS+JSX），
      // configFile:false 跳过 babel.config.js，nativewind 插件不参与 → JSX 走标准 react runtime。
      transform: {
        '^.+\\.[jt]sx?$': [
          'babel-jest',
          {
            configFile: false,
            babelrc: false,
            presets: ['babel-preset-expo'],
          },
        ],
      },
      // @tanstack/react-query 以 ESM 发布，web project 不带 jest-expo 默认 transformIgnorePatterns，需显式 transform
      transformIgnorePatterns: ['/node_modules/(?!@tanstack/react-query)'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],
};
