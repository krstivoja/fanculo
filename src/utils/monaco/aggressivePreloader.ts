/**
 * Aggressive Monaco Preloader
 * Preloads Monaco Editor and all required assets as early as possible
 */

import { monacoInstanceManager } from './monacoInstanceManager'
import { preloadCompletions } from './completionCache'

class AggressivePreloader {
  private preloadStarted = false
  private preloadComplete = false
  private preloadPromise: Promise<void> | null = null

  async startPreloading(): Promise<void> {
    if (this.preloadStarted) return this.preloadPromise!
    this.preloadStarted = true

    this.preloadPromise = this.performPreloading()
    return this.preloadPromise
  }

  private async performPreloading(): Promise<void> {
    console.debug('Starting aggressive Monaco preloading...')
    const startTime = Date.now()

    try {
      // Step 1: Preload Monaco Editor React component
      await this.preloadMonacoReact()
      
      // Step 2: Preload language workers
      await this.preloadLanguageWorkers()
      
      // Step 3: Preload completion data
      await this.preloadCompletionData()
      
      // Step 4: Preload themes and configurations
      await this.preloadThemes()

      this.preloadComplete = true
      const duration = Date.now() - startTime
      console.debug(`Monaco preloading completed in ${duration}ms`)
      
      // Trigger instance creation for common languages
      this.preloadInstances()
    } catch (error) {
      console.error('Monaco preloading failed:', error)
    }
  }

  private async preloadMonacoReact(): Promise<void> {
    try {
      // This will trigger the module loading
      const module = await import('@monaco-editor/react')
      console.debug('Monaco React component preloaded')
      return
    } catch (error) {
      console.warn('Failed to preload Monaco React:', error)
    }
  }

  private async preloadLanguageWorkers(): Promise<void> {
    try {
      // Preload common language workers
      const workers = [
        'ts.worker.js',
        'json.worker.js', 
        'css.worker.js',
        'html.worker.js',
        'editor.worker.js'
      ]

      const workerPromises = workers.map(worker => {
        return new Promise<void>((resolve) => {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = `/node_modules/monaco-editor/esm/vs/language/${worker}`
          link.onload = () => resolve()
          link.onerror = () => resolve() // Don't fail on individual worker errors
          document.head.appendChild(link)
        })
      })

      await Promise.allSettled(workerPromises)
      console.debug('Language workers preloaded')
    } catch (error) {
      console.warn('Failed to preload language workers:', error)
    }
  }

  private async preloadCompletionData(): Promise<void> {
    try {
      // Preload our completion data
      await preloadCompletions()
      console.debug('Completion data preloaded')
    } catch (error) {
      console.warn('Failed to preload completion data:', error)
    }
  }

  private async preloadThemes(): Promise<void> {
    try {
      // Monaco themes are built-in, but we can prefetch CSS assets
      const themeAssets = [
        'vs/editor/editor.main.css',
        'vs/base/browser/ui/codicons/codicon/codicon.ttf'
      ]

      const assetPromises = themeAssets.map(asset => {
        return new Promise<void>((resolve) => {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = `/node_modules/monaco-editor/esm/${asset}`
          link.onload = () => resolve()
          link.onerror = () => resolve()
          document.head.appendChild(link)
        })
      })

      await Promise.allSettled(assetPromises)
      console.debug('Theme assets preloaded')
    } catch (error) {
      console.warn('Failed to preload theme assets:', error)
    }
  }

  private async preloadInstances(): Promise<void> {
    try {
      // Create hidden containers for preloading instances
      const languages = ['php', 'scss']
      
      for (const language of languages) {
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.left = '-9999px'
        container.style.width = '100px'
        container.style.height = '100px'
        container.setAttribute('data-preload', language)
        document.body.appendChild(container)

        // Get or create instance (this will initialize Monaco)
        await monacoInstanceManager.getOrCreateInstance(language, container)
        
        // Clean up the container after a short delay
        setTimeout(() => {
          if (document.body.contains(container)) {
            document.body.removeChild(container)
          }
        }, 1000)
      }

      console.debug('Monaco instances preloaded')
    } catch (error) {
      console.warn('Failed to preload Monaco instances:', error)
    }
  }

  // Method to enable prefetching via <link> tags
  static injectPrefetchLinks(): void {
    const prefetchUrls = [
      // Monaco Editor core files
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
      '/node_modules/monaco-editor/esm/vs/language/html/html.worker.js'
    ]

    prefetchUrls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      document.head.appendChild(link)
    })

    console.debug('Monaco prefetch links injected')
  }

  isComplete(): boolean {
    return this.preloadComplete
  }

  getStats() {
    return {
      started: this.preloadStarted,
      complete: this.preloadComplete,
      instanceManager: monacoInstanceManager.getStats()
    }
  }
}

// Global preloader instance
export const aggressivePreloader = new AggressivePreloader()

// Auto-inject prefetch links as soon as this module loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      AggressivePreloader.injectPrefetchLinks()
    })
  } else {
    AggressivePreloader.injectPrefetchLinks()
  }

  // Start preloading on first user interaction
  const startPreloadingOnInteraction = () => {
    aggressivePreloader.startPreloading()
    // Remove listeners after first interaction
    document.removeEventListener('mousedown', startPreloadingOnInteraction)
    document.removeEventListener('keydown', startPreloadingOnInteraction)
    document.removeEventListener('touchstart', startPreloadingOnInteraction)
  }

  document.addEventListener('mousedown', startPreloadingOnInteraction, { passive: true })
  document.addEventListener('keydown', startPreloadingOnInteraction, { passive: true })
  document.addEventListener('touchstart', startPreloadingOnInteraction, { passive: true })

  // Fallback: start preloading after 2 seconds
  setTimeout(() => {
    aggressivePreloader.startPreloading()
  }, 2000)
}