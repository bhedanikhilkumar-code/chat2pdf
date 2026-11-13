import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const isExtension = mode === 'extension';

  return {
    base: './',
    plugins: [
      react(),
      !isExtension &&
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'Chat2PDF',
            short_name: 'Chat2PDF',
            description: 'Export AI chat conversations to multiple formats',
            theme_color: '#3b82f6',
            background_color: '#ffffff',
            display: 'standalone',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
            ],
          },
        }),
    ].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          sanitizeFileName: (name) => name.replace(/^_+/, 'ext-'),
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
  };
});
