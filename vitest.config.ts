import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@': path.resolve(__dirname, 'client', 'src'),
    }
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['server/tests/**/*.test.ts', 'client/src/**/*.test.ts', 'client/src/**/*.test.tsx'],
    passWithNoTests: false,
    threads: false,
  },
});