import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1800,
  },
  server: {
    strictPort: true,
  },
});
