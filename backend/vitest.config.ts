import { defineConfig } from 'vitest/config';

// Testes unitários: rápidos, sem banco. Ficam ao lado do código (src/**/*.spec.ts).
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
