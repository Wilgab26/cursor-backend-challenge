/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/env.setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  testTimeout: 20000,
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
