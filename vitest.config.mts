import { defineConfig } from 'vitest/config';

// Node-environment unit tests for pure logic across the workspace. React Native modules are mocked in
// the tests that need them (e.g. the processing coordinator), so no RN/native runtime is required.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'apps/mobile/src/**/*.test.ts'],
  },
});
