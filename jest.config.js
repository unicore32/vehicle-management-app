/** @type {import('jest-expo/jest-preset').JestPreset} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  // jest-expo が pnpm の .pnpm パスを考慮した transformIgnorePatterns を設定済みのため
  // ここでは上書きせずプリセットの設定を継承する
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
