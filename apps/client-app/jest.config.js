module.exports = {
  preset: 'jest-expo',
  // 20261111 audit 消减（GHSA-qr28-fpjm-wq7f）：decode-uri-component 0.2.2→0.5.1（唯一修复
  // 版，纯 ESM）经 query-string@7 → expo-router 进 jest 图。jest-expo 的
  // transformIgnorePatterns 白名单不含它 → "Unexpected token 'export'"。此处复刻 preset
  // 白名单并追加 query-string / decode-uri-component（两包均需 babel 转 ESM）。
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|query-string|decode-uri-component))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  setupFilesAfterEnv: ['@testing-library/react-native', '<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/src/**/__tests__/**/*.test.{ts,tsx}',
    '**/src/**/*.test.{ts,tsx}',
  ],
  collectCoverage: true, // 第五轮 W1：默认开启采集，coverageThreshold 才会在本地/CI 常规跑测时被评估
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  // 覆盖率棘轮（收尾批 3）：baseline = 20261010 实测值（62.87/60.4/58.72/65.54）
  // 下浮 ~1.5 点，先低后升，防覆盖率静默倒退
  coverageThreshold: {
    global: {
      statements: 61,
      branches: 59,
      functions: 57,
      lines: 64,
    },
  },
};