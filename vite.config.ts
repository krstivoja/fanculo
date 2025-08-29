import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5177,
    cors: true,
    host: 'localhost',
    hmr: {
      port: 5177,
      host: 'localhost'
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  define: {
    // Monaco Editor global variables
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      '@monaco-editor/react'
    ],
    exclude: [
      // Exclude Monaco Editor from pre-bundling to enable proper code splitting
      'monaco-editor'
    ]
  },
  worker: {
    format: 'es'
  }
})