module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/property/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/test/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Add Jest types
  setupFilesAfterEnv: ['<rootDir>/src/test/jest-setup.ts'],
  testTimeout: 30000, // 30 seconds timeout for property-based tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // Force Jest to exit after tests complete
  forceExit: true,
  // Detect open handles for debugging
  detectOpenHandles: false,
  // Clear mocks between tests
  clearMocks: true,
  // Reset modules between tests
  resetModules: true
};