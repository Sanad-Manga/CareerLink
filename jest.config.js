module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
  // Only meaningful when run with --coverage (CI passes the flag).
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/server.js',
    '!backend/seed.js',
    '!backend/config/**',
  ],
  coverageReporters: ['text-summary', 'text'],
};
