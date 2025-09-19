import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  },
  renderer: {
    root: '.',
    publicDir: 'src/assets',
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
    server: {
      port: 5173,
    },
  },
});
