import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        app: './src/main.js'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    manifest: true,
    emptyOutDir: true
  },
  server: {
    port: 3002,
    host: '0.0.0.0',
    cors: {
      origin: ['http://fanculo.local', 'http://localhost:3002'],
      credentials: true
    }
  }
})