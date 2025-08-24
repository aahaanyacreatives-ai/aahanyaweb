// jest.rules.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/rules/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.json'
    }]
  },
  setupFiles: ['<rootDir>/tests/rules/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
