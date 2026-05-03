import { resolve } from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { visualizer } from 'rollup-plugin-visualizer';

const watchIgnore = [resolve(__dirname, 'flatpak/build-dir')];

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
    },
    server: {
      watch: {
        ignored: watchIgnore,
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
    },
    server: {
      watch: {
        ignored: watchIgnore,
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  },
  renderer: {
    root: '.',
    publicDir: 'src/assets',
    server: {
      port: 5173,
      watch: {
        ignored: watchIgnore,
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: './index.html',
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    plugins: [
      react(),
      (process.env.ANALYZE === 'true' || process.env.ANALYZE === 'server') &&
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
          template: process.env.ANALYZE === 'server' ? 'network' : 'treemap',
        }),
    ].filter(Boolean),
  },
});
