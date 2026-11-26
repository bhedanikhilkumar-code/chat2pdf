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
    minify: 'terser',
    terserOptions: {
      format: {
        ascii_only: true,
      },
    },
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/extension/popup/popup.html'),
      },
      output: {
        entryFileNames: '[name]/[name].js',
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
