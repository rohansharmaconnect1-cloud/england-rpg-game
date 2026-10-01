import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  worker: { format: 'es' },
  server: { port: 5173 },
});
