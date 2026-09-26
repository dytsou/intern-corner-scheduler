import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['protobufjs'],
    exclude: ['or-tools-wasm'],
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true, // Clean docs folder on build
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  base: './', // Use relative paths for GitHub Pages
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: true,
    headers: isolationHeaders,
  },
  preview: {
    host: '127.0.0.1',
    headers: isolationHeaders,
  },
});
