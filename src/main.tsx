import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize Monaco caching and preloading as early as possible
import './utils/monaco/aggressivePreloader'
import './utils/monaco/serviceWorkerManager'
import './utils/monaco/memoryManager' // Initialize memory monitoring

console.log('🚀 Vite React app is loading...')
console.log('🎯 Target element:', document.getElementById('fanculo-root'))
console.log('⚡ Vite HMR active:', import.meta.hot ? 'YES' : 'NO')

const rootElement = document.getElementById('fanculo-root')
if (!rootElement) {
  console.error('❌ Target element "fanculo-root" not found!')
} else {
  console.log('✅ Found target element, rendering React app...')
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  console.log('🎉 React app rendered successfully!')
}