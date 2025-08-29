/**
 * Intelligent completion cache for Monaco Editor
 * Manages caching of autocomplete suggestions, snippets, and language features
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  accessCount: number
  lastAccessed: number
  size: number // Approximate memory size in bytes
}

interface CacheConfig {
  maxSize: number // Maximum number of entries
  maxMemory: number // Maximum memory usage in bytes
  ttl: number // Time to live in milliseconds
  cleanupInterval: number // Cleanup interval in milliseconds
}

class IntelligentCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private config: CacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalMemory: 0
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      maxMemory: config.maxMemory || 10 * 1024 * 1024, // 10MB
      ttl: config.ttl || 30 * 60 * 1000, // 30 minutes
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000 // 5 minutes
    }

    this.startCleanup()
  }

  private startCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []

    // Find expired entries
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.config.ttl) {
        keysToDelete.push(key)
      }
    })

    // Remove expired entries
    keysToDelete.forEach(key => {
      const entry = this.cache.get(key)
      if (entry) {
        this.stats.totalMemory -= entry.size
        this.stats.evictions++
      }
      this.cache.delete(key)
    })

    // If still over limits, remove least recently used entries
    this.evictLRU()
  }

  private evictLRU() {
    while (this.cache.size > this.config.maxSize || this.stats.totalMemory > this.config.maxMemory) {
      let oldestKey = ''
      let oldestTime = Date.now()

      // Find least recently used entry
      this.cache.forEach((entry, key) => {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed
          oldestKey = key
        }
      })

      if (oldestKey) {
        const entry = this.cache.get(oldestKey)
        if (entry) {
          this.stats.totalMemory -= entry.size
          this.stats.evictions++
        }
        this.cache.delete(oldestKey)
      } else {
        break // Safety break if no entries found
      }
    }
  }

  private estimateSize(data: T): number {
    // Rough estimate of object size in bytes
    try {
      return JSON.stringify(data).length * 2 // UTF-16 characters
    } catch {
      return 1024 // Default size if serialization fails
    }
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return undefined
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key)
      this.stats.totalMemory -= entry.size
      this.stats.misses++
      return undefined
    }

    // Update access statistics
    entry.lastAccessed = Date.now()
    entry.accessCount++
    this.stats.hits++

    return entry.data
  }

  set(key: string, data: T): void {
    const size = this.estimateSize(data)
    const now = Date.now()

    // Remove existing entry if present
    const existing = this.cache.get(key)
    if (existing) {
      this.stats.totalMemory -= existing.size
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      size
    }

    this.cache.set(key, entry)
    this.stats.totalMemory += size

    // Trigger cleanup if necessary
    if (this.cache.size > this.config.maxSize || this.stats.totalMemory > this.config.maxMemory) {
      this.evictLRU()
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key)
      this.stats.totalMemory -= entry.size
      return false
    }

    return true
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.stats.totalMemory -= entry.size
      return this.cache.delete(key)
    }
    return false
  }

  clear(): void {
    this.cache.clear()
    this.stats.totalMemory = 0
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      memoryUsage: this.stats.totalMemory,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }
}

// Specialized caches for different types of completions
class CompletionCacheManager {
  private phpFunctionCache: IntelligentCache<any[]>
  private wpHookCache: IntelligentCache<any[]>
  private scssPropertyCache: IntelligentCache<any[]>
  private snippetCache: IntelligentCache<any[]>
  private emmetCache: IntelligentCache<string>

  constructor() {
    // Configure different cache types with appropriate settings
    this.phpFunctionCache = new IntelligentCache({
      maxSize: 500,
      maxMemory: 2 * 1024 * 1024, // 2MB
      ttl: 60 * 60 * 1000 // 1 hour
    })

    this.wpHookCache = new IntelligentCache({
      maxSize: 200,
      maxMemory: 1 * 1024 * 1024, // 1MB
      ttl: 2 * 60 * 60 * 1000 // 2 hours
    })

    this.scssPropertyCache = new IntelligentCache({
      maxSize: 300,
      maxMemory: 1 * 1024 * 1024, // 1MB
      ttl: 30 * 60 * 1000 // 30 minutes
    })

    this.snippetCache = new IntelligentCache({
      maxSize: 100,
      maxMemory: 5 * 1024 * 1024, // 5MB (snippets can be large)
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    })

    this.emmetCache = new IntelligentCache({
      maxSize: 1000,
      maxMemory: 500 * 1024, // 500KB
      ttl: 10 * 60 * 1000 // 10 minutes
    })
  }

  // PHP function completions
  getPHPCompletions(context: string): any[] | undefined {
    return this.phpFunctionCache.get(context)
  }

  setPHPCompletions(context: string, completions: any[]): void {
    this.phpFunctionCache.set(context, completions)
  }

  // WordPress hook completions
  getWPHookCompletions(hookType: 'action' | 'filter'): any[] | undefined {
    return this.wpHookCache.get(hookType)
  }

  setWPHookCompletions(hookType: 'action' | 'filter', hooks: any[]): void {
    this.wpHookCache.set(hookType, hooks)
  }

  // SCSS property completions
  getSCSSCompletions(context: string): any[] | undefined {
    return this.scssPropertyCache.get(context)
  }

  setSCSSCompletions(context: string, completions: any[]): void {
    this.scssPropertyCache.set(context, completions)
  }

  // Code snippets
  getSnippets(language: string): any[] | undefined {
    return this.snippetCache.get(language)
  }

  setSnippets(language: string, snippets: any[]): void {
    this.snippetCache.set(language, snippets)
  }

  // Emmet expansions
  getEmmetExpansion(abbreviation: string): string | undefined {
    return this.emmetCache.get(abbreviation)
  }

  setEmmetExpansion(abbreviation: string, expansion: string): void {
    this.emmetCache.set(abbreviation, expansion)
  }

  // Cache invalidation
  invalidateContext(context: string): void {
    this.phpFunctionCache.delete(context)
    this.scssPropertyCache.delete(context)
  }

  invalidateLanguage(language: string): void {
    this.snippetCache.delete(language)
  }

  // Statistics
  getAllStats() {
    return {
      phpFunctions: this.phpFunctionCache.getStats(),
      wpHooks: this.wpHookCache.getStats(),
      scssProperties: this.scssPropertyCache.getStats(),
      snippets: this.snippetCache.getStats(),
      emmet: this.emmetCache.getStats(),
      totalMemory: this.getTotalMemoryUsage()
    }
  }

  private getTotalMemoryUsage(): number {
    return [
      this.phpFunctionCache,
      this.wpHookCache,
      this.scssPropertyCache,
      this.snippetCache,
      this.emmetCache
    ].reduce((total, cache) => total + cache.getStats().memoryUsage, 0)
  }

  // Cleanup
  destroy(): void {
    [
      this.phpFunctionCache,
      this.wpHookCache,
      this.scssPropertyCache,
      this.snippetCache,
      this.emmetCache
    ].forEach(cache => cache.destroy())
  }
}

// Global cache manager instance
export const completionCache = new CompletionCacheManager()

// Utility functions
export const preloadCompletions = async () => {
  try {
    // Preload commonly used completions
    const [wpFunctionsModule, wpHooksModule] = await Promise.all([
      import('../data/wordpressFunctions.json').catch(() => ({ default: [] })),
      import('../data/wordpressHooks.json').catch(() => ({ default: { actions: [], filters: [] } }))
    ])
    
    const wpFunctions = wpFunctionsModule.default || []
    const wpHooks = wpHooksModule.default || { actions: [], filters: [] }
    
    // Cache WordPress functions by category for better organization
    const functionsByCategory = wpFunctions.reduce((acc: any, func: any) => {
      const category = func.category || 'general'
      if (!acc[category]) acc[category] = []
      acc[category].push(func)
      return acc
    }, {})
    
    // Cache all WordPress functions and hooks
    completionCache.setPHPCompletions('wordpress', wpFunctions)
    Object.entries(functionsByCategory).forEach(([category, functions]) => {
      completionCache.setPHPCompletions(`wordpress-${category}`, functions as any[])
    })
    
    completionCache.setWPHookCompletions('action', wpHooks.actions || [])
    completionCache.setWPHookCompletions('filter', wpHooks.filters || [])
    
    console.debug('Preloaded WordPress completions:', {
      totalFunctions: wpFunctions.length,
      categories: Object.keys(functionsByCategory),
      actions: (wpHooks.actions && wpHooks.actions.length) || 0,
      filters: (wpHooks.filters && wpHooks.filters.length) || 0
    })
  } catch (error) {
    console.warn('Failed to preload some completions:', error)
  }
}

export const getCacheMetrics = () => {
  return completionCache.getAllStats()
}

export const clearAllCaches = () => {
  completionCache.destroy()
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    completionCache.destroy()
  })
}