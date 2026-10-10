module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/react-native', '<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/src/**/__tests__/**/*.test.{ts,tsx}',
    '**/src/**/*.test.{ts,tsx}',
  ],
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