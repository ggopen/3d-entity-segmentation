import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'copy-cesium',
      apply: 'build',
      closeBundle: {
        order: 'post',
        handler() {
          const srcDir = resolve(__dirname, 'node_modules', 'cesium', 'Build', 'Cesium')
          const destDir = resolve(__dirname, 'dist', 'cesium')
          if (!fs.existsSync(srcDir)) {
            console.warn('Cesium source not found at', srcDir)
            return
          }
          fs.mkdirSync(destDir, { recursive: true })
          fs.cpSync(srcDir, destDir, { recursive: true })
          console.log('Cesium files copied to dist/cesium')

          const cesiumJsPath = resolve(destDir, 'Cesium.js')
          if (fs.existsSync(cesiumJsPath)) {
            let code = fs.readFileSync(cesiumJsPath, 'utf-8')
            if (code.indexOf('window.Cesium = (()=>{') === -1) {
              const marker = 'var Cesium=(()=>{'
              const startIdx = code.indexOf(marker)
              if (startIdx !== -1) {
                const newPrefix = 'window.Cesium = (()=>{'
                code = code.substring(0, startIdx) + newPrefix + code.substring(startIdx + marker.length)
                fs.writeFileSync(cesiumJsPath, code, 'utf-8')
                console.log('Cesium.js patched: window.Cesium = (()=>{...})()')
              }
            }
          }
        }
      }
    }
  ],
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
