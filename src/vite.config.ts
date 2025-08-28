import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(async ({ command, mode }) => {
    return {
        base: mode === 'development' ? '/' : path.resolve(__dirname, '../dist/'),
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src')
            }
        },
        server: {
            origin: 'http://localhost:5177',
            port: 5177,
            cors: true,
            host: true
        },
        build: {
            assetsDir: './',
            outDir: '../dist/',
            emptyOutDir: true,
            manifest: false,
            rollupOptions: {
                input: './src/main.tsx',
                output: {
                    entryFileNames: 'main.js',
                    chunkFileNames: 'chunks/[name].js',
                    assetFileNames: 'assets/[name].[ext]'
                }
            }
        }
    }
})