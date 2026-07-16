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
    watch: {
      // Test and visual-QA outputs are written inside the repository. They
      // must never trigger a full-page HMR reload in an active game journey.
      ignored: [
        '**/playwright-report/**',
        '**/playwright-preview-report/**',
        '**/test-results/**',
        '**/test-results-preview/**',
        '**/visual-qa/**',
        '**/art/generated-sources/**',
        '**/art/generated-masters/**',
        '**/.runtime-build/**',
        '**/.art-pipeline-test/**',
      ],
    },
  },
});
