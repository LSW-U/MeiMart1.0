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
      testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/src/services/queries/', '/src/components/ui/'],
    },
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      // react-native index.js 顶层读 __DEV__，jsdom 无 RN runtime 需注入（jest-expo preset 同款）
      globals: { __DEV__: true },
      // queries hooks + ui 组件测试归 web project（jsdom + @testing-library/react）
      testMatch: ['<rootDir>/src/services/queries/**/*.test.tsx', '<rootDir>/src/components/ui/**/*.test.tsx'],
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
      // 防御性放行：moduleNameMapper 只映射精确包名 'react-native'，若有库 import
      // 'react-native/Libraries/...' 子路径会走真包，这里让它可 transform（审查 M2）
      transformIgnorePatterns: ['/node_modules/(?!@tanstack/react-query|react-native)'],
      // react-native index.js 顶层读 NativeModules/TurboModuleRegistry，jsdom 无 RN runtime 会崩；
      // 换成 src/test/react-native.mock.js 的最小 host 壳（组件测试只需可渲染可透传 props）
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^react-native$': '<rootDir>/src/test/react-native.mock.js',
      },
    },
  ],
};
