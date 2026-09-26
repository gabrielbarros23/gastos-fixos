import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // O front chama /api na própria origem e o Vite repassa para o Nest.
    // Assim o cookie do refresh token (SameSite=Strict, path /api/auth)
    // funciona em desenvolvimento sem configurar CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
