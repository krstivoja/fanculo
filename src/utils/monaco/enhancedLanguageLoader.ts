import type { languages } from 'monaco-editor'

type SupportedLanguage = 'php' | 'scss' | 'html' | 'css'

interface LanguageConfig {
  id: string
  loaded: boolean
  loading: boolean
  lastUsed: number
  loadPromise?: Promise<void>
  disposables: any[]
}

interface CacheStats {
  totalLanguages: number
  loadedLanguages: number
  cacheHits: number
  cacheMisses: number
  memoryUsage: number
}

// Enhanced language cache with intelligent management
class LanguageCache {
  private cache = new Map<SupportedLanguage, LanguageConfig>()
  private stats: CacheStats = {
    totalLanguages: 0,
    loadedLanguages: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memoryUsage: 0
  }
  private maxCacheSize = 5 // Maximum number of cached languages
  private cacheTimeout = 30 * 60 * 1000 // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start periodic cleanup
    this.startCleanup()
  }

  private startCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries()
    }, 5 * 60 * 1000) // Cleanup every 5 minutes
  }

  private cleanupStaleEntries() {
    const now = Date.now()
    const staleEntries: SupportedLanguage[] = []

    this.cache.forEach((config, language) => {
      if (config.loaded && now - config.lastUsed > this.cacheTimeout) {
        staleEntries.push(language)
      }
    })

    // Remove least recently used if cache is full
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
      
      const entriesToRemove = sortedEntries.slice(0, sortedEntries.length - this.maxCacheSize)
      entriesToRemove.forEach(([language]) => staleEntries.push(language))
    }

    staleEntries.forEach(language => this.disposeLanguage(language))
  }

  private disposeLanguage(language: SupportedLanguage) {
    const config = this.cache.get(language)
    if (!config) return

    // Dispose of all registered providers and listeners
    config.disposables.forEach(disposable => {
      if (disposable && typeof disposable.dispose === 'function') {
        try {
          disposable.dispose()
        } catch (error) {
          console.warn(`Error disposing ${language} language feature:`, error)
        }
      }
    })

    this.cache.delete(language)
    this.stats.loadedLanguages--
    
    console.debug(`Disposed language: ${language}`)
  }

  get(language: SupportedLanguage): LanguageConfig | undefined {
    const config = this.cache.get(language)
    if (config) {
      config.lastUsed = Date.now()
      this.stats.cacheHits++
    } else {
      this.stats.cacheMisses++
    }
    return config
  }

  set(language: SupportedLanguage, config: LanguageConfig) {
    this.cache.set(language, config)
    if (config.loaded) {
      this.stats.loadedLanguages++
    }
    this.stats.totalLanguages = this.cache.size
  }

  has(language: SupportedLanguage): boolean {
    return this.cache.has(language)
  }

  getStats(): CacheStats {
    // Calculate approximate memory usage
    this.stats.memoryUsage = this.cache.size * 1024 // Rough estimate
    return { ...this.stats }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    // Dispose all languages
    Array.from(this.cache.keys()).forEach(language => {
      this.disposeLanguage(language)
    })
    
    this.cache.clear()
  }
}

// Global cache instance
const languageCache = new LanguageCache()

/**
 * Enhanced language loading with intelligent caching and preloading
 */
export const loadLanguage = async (language: SupportedLanguage): Promise<void> => {
  const cached = languageCache.get(language)
  
  // Return immediately if already loaded
  if (cached?.loaded) {
    console.debug(`Language ${language} loaded from cache`)
    return
  }
  
  // Return existing promise if currently loading
  if (cached?.loading && cached.loadPromise) {
    console.debug(`Language ${language} already loading, waiting...`)
    return cached.loadPromise
  }

  // Create new loading promise
  const loadPromise = loadLanguageInternal(language)
  
  // Update cache with loading state
  languageCache.set(language, {
    id: language,
    loaded: false,
    loading: true,
    lastUsed: Date.now(),
    loadPromise,
    disposables: []
  })

  try {
    await loadPromise
    
    // Update cache with loaded state
    const config = languageCache.get(language)
    if (config) {
      config.loaded = true
      config.loading = false
      config.loadPromise = undefined
    }
    
    console.debug(`Language ${language} loaded successfully`)
  } catch (error) {
    console.error(`Failed to load language ${language}:`, error)
    
    // Remove failed entry from cache
    if (languageCache.has(language)) {
      languageCache.disposeLanguage(language)
    }
    
    throw error
  }
}

/**
 * Preload commonly used languages for better performance
 */
export const preloadCommonLanguages = async (): Promise<void> => {
  const commonLanguages: SupportedLanguage[] = ['php', 'scss']
  const loadPromises = commonLanguages.map(lang => 
    loadLanguage(lang).catch(error => {
      console.warn(`Failed to preload ${lang}:`, error)
    })
  )
  
  await Promise.allSettled(loadPromises)
  console.debug('Common languages preloading completed')
}

/**
 * Check if a language is ready for use
 */
export const isLanguageReady = (language: SupportedLanguage): boolean => {
  const cached = languageCache.get(language)
  return cached?.loaded || false
}

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = (): CacheStats => {
  return languageCache.getStats()
}

/**
 * Clear language cache and free memory
 */
export const clearCache = (): void => {
  languageCache.destroy()
  console.debug('Language cache cleared')
}

/**
 * Register a disposable with a language for proper cleanup
 */
export const registerDisposable = (language: SupportedLanguage, disposable: any): void => {
  const config = languageCache.get(language)
  if (config) {
    config.disposables.push(disposable)
  }
}

/**
 * Internal language loading implementation
 */
const loadLanguageInternal = async (language: SupportedLanguage): Promise<void> => {
  switch (language) {
    case 'php':
      await loadPHPLanguage()
      break
    case 'scss':
      await loadSCSSLanguage()
      break
    case 'html':
      await loadHTMLLanguage()
      break
    case 'css':
      await loadCSSLanguage()
      break
    default:
      throw new Error(`Language ${language} is not supported`)
  }
}

/**
 * Load PHP language with enhanced error handling
 */
const loadPHPLanguage = async (): Promise<void> => {
  try {
    const [{ default: php }] = await Promise.all([
      import('monaco-editor/esm/vs/basic-languages/php/php.js')
    ])

    const monaco = await import('monaco-editor')
    
    // Check if already registered
    const existingLanguages = monaco.languages.getLanguages()
    const phpExists = existingLanguages.some(lang => lang.id === 'php')

    if (!phpExists) {
      monaco.languages.register({ id: 'php' })
      monaco.languages.setMonarchTokensProvider('php', php.language)
      monaco.languages.setLanguageConfiguration('php', php.conf)
    }
  } catch (error) {
    console.error('Failed to load PHP language:', error)
    throw error
  }
}

/**
 * Load SCSS language with enhanced error handling
 */
const loadSCSSLanguage = async (): Promise<void> => {
  try {
    const [{ default: scss }] = await Promise.all([
      import('monaco-editor/esm/vs/basic-languages/scss/scss.js')
    ])

    const monaco = await import('monaco-editor')
    
    // Check if already registered
    const existingLanguages = monaco.languages.getLanguages()
    const scssExists = existingLanguages.some(lang => lang.id === 'scss')

    if (!scssExists) {
      monaco.languages.register({ id: 'scss' })
      monaco.languages.setMonarchTokensProvider('scss', scss.language)
      monaco.languages.setLanguageConfiguration('scss', scss.conf)
    }
  } catch (error) {
    console.error('Failed to load SCSS language:', error)
    throw error
  }
}

/**
 * Load HTML language with enhanced error handling
 */
const loadHTMLLanguage = async (): Promise<void> => {
  try {
    const [{ default: html }] = await Promise.all([
      import('monaco-editor/esm/vs/basic-languages/html/html.js')
    ])

    const monaco = await import('monaco-editor')
    
    const existingLanguages = monaco.languages.getLanguages()
    const htmlExists = existingLanguages.some(lang => lang.id === 'html')

    if (!htmlExists) {
      monaco.languages.register({ id: 'html' })
      monaco.languages.setMonarchTokensProvider('html', html.language)
      monaco.languages.setLanguageConfiguration('html', html.conf)
    }
  } catch (error) {
    console.error('Failed to load HTML language:', error)
    throw error
  }
}

/**
 * Load CSS language with enhanced error handling
 */
const loadCSSLanguage = async (): Promise<void> => {
  try {
    const [{ default: css }] = await Promise.all([
      import('monaco-editor/esm/vs/basic-languages/css/css.js')
    ])

    const monaco = await import('monaco-editor')
    
    const existingLanguages = monaco.languages.getLanguages()
    const cssExists = existingLanguages.some(lang => lang.id === 'css')

    if (!cssExists) {
      monaco.languages.register({ id: 'css' })
      monaco.languages.setMonarchTokensProvider('css', css.language)
      monaco.languages.setLanguageConfiguration('css', css.conf)
    }
  } catch (error) {
    console.error('Failed to load CSS language:', error)
    throw error
  }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    languageCache.destroy()
  })
}

export { languageCache }