import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    port: 5173,
    open: true,
  },
})

