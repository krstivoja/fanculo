/**
 * Monaco Editor Service Worker
 * Aggressively caches Monaco Editor assets for instant loading
 */

const CACHE_NAME = 'monaco-editor-cache-v1'
const MONACO_ASSETS = [
  // Core Monaco files
  '/node_modules/monaco-editor/esm/vs/editor/editor.main.js',
  '/node_modules/monaco-editor/esm/vs/editor/editor.main.css',
  '/node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf',
  
  // Language support
  '/node_modules/monaco-editor/esm/vs/basic-languages/php/php.js',
  '/node_modules/monaco-editor/esm/vs/basic-languages/scss/scss.js',
  '/node_modules/monaco-editor/esm/vs/basic-languages/html/html.js',
  '/node_modules/monaco-editor/esm/vs/basic-languages/css/css.js',
  
  // Workers
  '/node_modules/monaco-editor/esm/vs/editor.worker.js',
  '/node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
  '/node_modules/monaco-editor/esm/vs/language/html/html.worker.js',
  
  // React Monaco Editor
  '/node_modules/@monaco-editor/react/lib/es/index.js',
]

// Install event - cache Monaco assets immediately
self.addEventListener('install', (event) => {
  console.log('Monaco SW: Installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Monaco SW: Caching Monaco assets...')
        return cache.addAll(MONACO_ASSETS.map(url => {
          // Create request with no-cors mode for cross-origin assets
          return new Request(url, { 
            mode: 'no-cors',
            cache: 'force-cache'
          })
        }))
      })
      .then(() => {
        console.log('Monaco SW: All assets cached successfully')
        // Force activation of new service worker
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Monaco SW: Failed to cache assets:', error)
      })
  )
})

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('Monaco SW: Activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Clean up old caches
      const deletePromises = cacheNames
        .filter(cacheName => cacheName.startsWith('monaco-editor-cache-') && cacheName !== CACHE_NAME)
        .map(cacheName => caches.delete(cacheName))
      
      return Promise.all(deletePromises)
    }).then(() => {
      console.log('Monaco SW: Activated and ready')
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache first, with network fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Only intercept requests for Monaco assets
  if (MONACO_ASSETS.some(asset => url.pathname.includes(asset.split('/').pop()))) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('Monaco SW: Serving from cache:', url.pathname)
            return cachedResponse
          }
          
          console.log('Monaco SW: Fetching from network:', url.pathname)
          return fetch(event.request)
            .then((networkResponse) => {
              // Cache the response for future use
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone()
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, responseClone))
              }
              return networkResponse
            })
        })
        .catch((error) => {
          console.error('Monaco SW: Fetch failed:', error)
          // Return a basic response to prevent errors
          return new Response('Monaco asset not available', { 
            status: 404, 
            statusText: 'Not Found' 
          })
        })
    )
  }
  
  // For all other requests, just use the network
})

// Message event - handle commands from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'GET_CACHE_STATUS':
      caches.open(CACHE_NAME)
        .then((cache) => cache.keys())
        .then((keys) => {
          event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            data: {
              cacheSize: keys.length,
              totalAssets: MONACO_ASSETS.length,
              cached: keys.map(req => req.url)
            }
          })
        })
      break
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME)
        .then(() => {
          event.ports[0].postMessage({
            type: 'CACHE_CLEARED',
            data: { success: true }
          })
        })
      break
      
    case 'PRELOAD_ASSETS':
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(MONACO_ASSETS))
        .then(() => {
          event.ports[0].postMessage({
            type: 'ASSETS_PRELOADED',
            data: { success: true }
          })
        })
      break
        
    default:
      console.log('Monaco SW: Unknown message type:', type)
  }
})