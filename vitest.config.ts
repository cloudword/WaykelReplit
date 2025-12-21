import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared')
    }
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['server/tests/**/*.test.ts'],
    passWithNoTests: false,
    threads: false,
  },
});