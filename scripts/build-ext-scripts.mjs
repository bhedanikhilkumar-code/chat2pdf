import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const alias = {
  '@core': path.resolve(rootDir, 'src/core'),
  '@web': path.resolve(rootDir, 'src/web'),
  '@ext': path.resolve(rootDir, 'src/extension'),
};

const commonTerser = {
  format: {
    ascii_only: true,
  },
};

async function buildExtensionScripts() {
  console.log('Building self-contained IIFE bundle for content/extractor.js...');
  await build({
    configFile: false,
    resolve: { alias },
    build: {
      outDir: path.resolve(rootDir, 'dist-extension'),
      emptyOutDir: false,
      minify: 'terser',
      terserOptions: commonTerser,
      lib: {
        entry: path.resolve(rootDir, 'src/extension/content/extractor.ts'),
        name: 'Chat2PdfExtractor',
        formats: ['iife'],
        fileName: () => 'content/extractor.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  console.log('Building self-contained IIFE bundle for background/service-worker.js...');
  await build({
    configFile: false,
    resolve: { alias },
    build: {
      outDir: path.resolve(rootDir, 'dist-extension'),
      emptyOutDir: false,
      minify: 'terser',
      terserOptions: commonTerser,
      lib: {
        entry: path.resolve(rootDir, 'src/extension/background/service-worker.ts'),
        name: 'Chat2PdfServiceWorker',
        formats: ['iife'],
        fileName: () => 'background/service-worker.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });
}

buildExtensionScripts().catch((err) => {
  console.error('Failed to build extension standalone scripts:', err);
  process.exit(1);
});
