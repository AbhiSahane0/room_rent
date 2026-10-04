/** Unit tests for pure TypeScript helpers (formatting, validation). UI is verified by running the app. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/utils/**/*.test.ts', '<rootDir>/features/**/*.test.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { diagnostics: false, tsconfig: { module: 'commonjs', target: 'ES2020', esModuleInterop: true } }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
};
