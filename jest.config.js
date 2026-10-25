/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/env.setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  testTimeout: 20000,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/main.ts'],
  coverageDirectory: '<rootDir>/coverage',
  // lcov.info is what the Coveralls reporter uploads from CI
  coverageReporters: ['text-summary', 'lcov'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
