import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

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