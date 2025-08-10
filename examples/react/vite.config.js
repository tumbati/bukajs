import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@tumbati/bukajs': '../../src/core/index.js',
      '@tumbati/bukajs/renderers': '../../src/renderers'
    }
  }
})