import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-extension',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/extension/popup/popup.html'),
        extractor: path.resolve(__dirname, 'src/extension/content/extractor.ts'),
        'service-worker': path.resolve(__dirname, 'src/extension/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'extractor') {
            return 'content/extractor.js';
          }
          if (chunkInfo.name === 'service-worker') {
            return 'background/service-worker.js';
          }
          return '[name]/[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@web': path.resolve(__dirname, 'src/web'),
      '@ext': path.resolve(__dirname, 'src/extension'),
    },
  },
});
