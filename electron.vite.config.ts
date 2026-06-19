import { resolve } from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  main: {
    plugins: [
      {
        name: 'remove-esm-shim',
        configResolved(config) {
          const plugins = config.plugins as { name: string }[];
          const idx = plugins.findIndex((p) => p.name === 'vite:esm-shim');
          if (idx >= 0) plugins.splice(idx, 1);
        },
      },
    ],
    build: {
      externalizeDeps: true,
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
