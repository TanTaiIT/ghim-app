/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  // Cùng alias với tsconfig `paths` — Jest không đọc tsconfig.
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // Test nằm cạnh file nó kiểm (`x.test.ts` bên `x.ts`) — không có thư mục `__tests__` riêng.
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/api/generated/**'],
};
