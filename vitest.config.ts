import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/src',
      '@config': '/src/config',
      '@constants': '/src/constants',
      '@lib': '/src/lib',
      '@scripts': '/src/scripts',
    },
  },
});
