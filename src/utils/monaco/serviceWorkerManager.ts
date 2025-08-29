/**
 * Service Worker Manager for Monaco Caching
 */

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private isSupported = false

  constructor() {
    this.isSupported = 'serviceWorker' in navigator
    if (this.isSupported) {
      this.register()
    }
  }

  private async register(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register('/monaco-sw.js', {
        scope: '/'
      })

      console.log('Monaco SW: Registration successful')

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Monaco SW: New version available')
              // Could notify user about update
            }
          })
        }
      })

      // Handle messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Monaco SW: Message received:', event.data)
      })

    } catch (error) {
      console.error('Monaco SW: Registration failed:', error)
    }
  }

  async getCacheStatus(): Promise<any> {
    if (!this.registration || !this.registration.active) {
      return { error: 'Service worker not active' }
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.data)
      }

      this.registration!.active!.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      )
    })
  }

  async clearCache(): Promise<boolean> {
    if (!this.registration || !this.registration.active) {
      return false
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.data.success)
      }

      this.registration!.active!.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      )
    })
  }

  async preloadAssets(): Promise<boolean> {
    if (!this.registration || !this.registration.active) {
      return false
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.data.success)
      }

      this.registration!.active!.postMessage(
        { type: 'PRELOAD_ASSETS' },
        [messageChannel.port2]
      )
    })
  }

  isServiceWorkerSupported(): boolean {
    return this.isSupported
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }
}

// Global service worker manager
export const serviceWorkerManager = new ServiceWorkerManager()

// Utility to check if assets are cached
export async function areMonacoAssetsCached(): Promise<boolean> {
  try {
    const status = await serviceWorkerManager.getCacheStatus()
    return status.cacheSize > 0 && status.cacheSize >= status.totalAssets * 0.8 // At least 80% cached
  } catch {
    return false
  }
}