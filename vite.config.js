import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'esm'
      }
    }
  }
})
