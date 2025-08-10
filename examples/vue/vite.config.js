import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3001,
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