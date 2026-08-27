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
      // pnpm 布局兼容：依赖真身在 node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/ 深路径。
      // (\.pnpm/)? 可选段让放行列表同时命中「包根」（.pnpm 目录名的 @scope+name@ver 前缀）
      // 与「第二段 node_modules 里的真包路径」——@react-native/jest-preset 的 setup.js（ESM）
      // 与 @react-native/js-polyfills 不放行会报 "Cannot use import statement outside a module"。
      // 注意 @react-native(-community)? 后不加 /（scope 包靠前缀匹配，不加斜杠才能命中
      // @react-native-community 与 .pnpm 目录名里的 @react-native+jest-preset@ver 两种形态）。
      transformIgnorePatterns: [
        'node_modules/(?!(.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|nativewind|react-native-svg))',
      ],
      // queries hooks + ui/feedback/layout 组件 + app 页面测试归 web project（jsdom），rn project 跳过
      // 注意：页面测试文件在 src/test/pages/（不放 app/——expo-router 会把 .test.tsx 当路由模块
      // 打进 bundle，真机 hermes 无 jest 全局直接 ReferenceError 崩启动）
      testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/src/services/queries/', '/src/components/ui/', '/src/components/feedback/', '/src/components/layout/', '/src/test/pages/', '/app/'],
    },
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      // react-native index.js 顶层读 __DEV__，jsdom 无 RN runtime 需注入（jest-expo preset 同款）
      globals: { __DEV__: true },
      // queries hooks + ui/feedback/layout 组件 + app 页面测试归 web project（jsdom + @testing-library/react）
      // 页面测试 2026-08-20 从 app/** 迁到 src/test/pages/**：expo-router 扫描 app/ 时把 .test.tsx
      // 注册为路由（.test 后缀不剥），真机加载模块顶层 jest.mock 即崩（jest is not defined）
      testMatch: ['<rootDir>/src/services/queries/**/*.test.tsx', '<rootDir>/src/components/ui/**/*.test.tsx', '<rootDir>/src/components/feedback/**/*.test.tsx', '<rootDir>/src/components/layout/**/*.test.tsx', '<rootDir>/src/test/pages/**/*.test.tsx'],
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
        // C3（批次2）：rider react 已与 client 统一 pin 19.2.3（根 hoisted 单一副本），
        // 拆掉原「钉 pnpm 虚拟层 react-dom@19.2.7 同层 react」的 workaround——
        // 该钉版在版本目录名里硬编码 19.2.7，升级 React 会静默断。现在 react/react-dom
        // 精确同版本由 package.json 双 pin 保证，jest 走默认解析即可。
        '^react-native$': '<rootDir>/src/test/react-native.mock.js',
        // AppIcon 经 @expo/vector-icons 拉真图标集（ESM），组件测试只需要可渲染 host
        '^@expo/vector-icons$': '<rootDir>/src/test/expo-vector-icons.mock.js',
        // T3：EvidenceUpload（pickup/sign）require('expo-image-picker') 拉原生相机，
        // jsdom 无 runtime；桩成可控 mock（权限/拍照结果可注入）
        '^expo-image-picker$': '<rootDir>/src/test/expo-image-picker.mock.js',
        // T1 审查 P3-1（tasks 页测试）：babel-preset-expo 把 process.env.EXPO_PUBLIC_*
        // 编译成 require('expo/virtual/env')（ESM 发布，web project 不 transform →
        // "Unexpected token 'export'"）。页面级测试经 TaskDetailHeader→api.ts 首次
        // 拉进该链。桩成 CJS env 透传 process.env（与真包语义一致）。
        '^expo/virtual/env$': '<rootDir>/src/test/expo-virtual-env.mock.js',
      },
    },
  ],
};
