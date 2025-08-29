/**
 * Advanced preloading strategies for Monaco Editor
 * Implements intelligent preloading based on usage patterns and context
 */

import { loadLanguage, isLanguageReady, getCacheStats, registerDisposable } from './enhancedLanguageLoader'
import { completionCache, preloadCompletions } from './completionCache'

type SupportedLanguage = 'php' | 'scss' | 'html' | 'css'
type PreloadStrategy = 'eager' | 'lazy' | 'intelligent' | 'user-driven'

interface PreloadConfig {
  strategy: PreloadStrategy
  priority: SupportedLanguage[]
  maxConcurrency: number
  delayBetweenLoads: number
  enableBackgroundLoading: boolean
  trackUsagePatterns: boolean
}

interface UsagePattern {
  language: SupportedLanguage
  frequency: number
  lastUsed: number
  contextSwitchCount: number
  averageSessionTime: number
}

class PreloadManager {
  private config: PreloadConfig
  private usagePatterns = new Map<SupportedLanguage, UsagePattern>()
  private loadingQueue: SupportedLanguage[] = []
  private isPreloading = false
  private preloadPromises = new Map<SupportedLanguage, Promise<void>>()
  private intersectionObserver?: IntersectionObserver
  private idleCallback?: number

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = {
      strategy: config.strategy || 'intelligent',
      priority: config.priority || ['php', 'scss', 'html', 'css'],
      maxConcurrency: config.maxConcurrency || 2,
      delayBetweenLoads: config.delayBetweenLoads || 100,
      enableBackgroundLoading: config.enableBackgroundLoading ?? true,
      trackUsagePatterns: config.trackUsagePatterns ?? true
    }

    this.initializeUsageTracking()
    this.setupIntersectionObserver()
  }

  /**
   * Initialize usage pattern tracking
   */
  private initializeUsageTracking() {
    if (!this.config.trackUsagePatterns) return

    // Load usage patterns from localStorage
    try {
      const stored = localStorage.getItem('monaco-usage-patterns')
      if (stored) {
        const patterns = JSON.parse(stored)
        Object.entries(patterns).forEach(([lang, pattern]) => {
          this.usagePatterns.set(lang as SupportedLanguage, pattern as UsagePattern)
        })
      }
    } catch (error) {
      console.warn('Failed to load usage patterns:', error)
    }

    // Save patterns periodically
    setInterval(() => this.saveUsagePatterns(), 30000) // Every 30 seconds
  }

  /**
   * Setup intersection observer for editor visibility
   */
  private setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            this.onEditorVisible()
          }
        })
      },
      { threshold: 0.5 }
    )
  }

  /**
   * Handle editor becoming visible
   */
  private onEditorVisible() {
    if (this.config.strategy === 'lazy' || this.config.strategy === 'intelligent') {
      this.startPreloading()
    }
  }

  /**
   * Start preloading based on configured strategy
   */
  async startPreloading(): Promise<void> {
    if (this.isPreloading) return

    this.isPreloading = true

    try {
      switch (this.config.strategy) {
        case 'eager':
          await this.eagerPreload()
          break
        case 'lazy':
          await this.lazyPreload()
          break
        case 'intelligent':
          await this.intelligentPreload()
          break
        case 'user-driven':
          // Wait for explicit user action
          break
      }
    } finally {
      this.isPreloading = false
    }
  }

  /**
   * Eager preloading - load all languages immediately
   */
  private async eagerPreload(): Promise<void> {
    console.debug('Starting eager preload')
    
    const loadPromises = this.config.priority.map(async (language, index) => {
      // Add delay to prevent overwhelming the browser
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenLoads * index))
      }
      
      return this.preloadLanguage(language)
    })

    await Promise.allSettled(loadPromises)
    await preloadCompletions()
  }

  /**
   * Lazy preloading - load based on idle time and user interaction
   */
  private async lazyPreload(): Promise<void> {
    console.debug('Starting lazy preload')

    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      this.scheduleIdlePreload()
    } else {
      // Fallback to setTimeout with delay
      setTimeout(() => this.preloadPriority(), 1000)
    }
  }

  /**
   * Intelligent preloading - based on usage patterns and context
   */
  private async intelligentPreload(): Promise<void> {
    console.debug('Starting intelligent preload')

    const rankedLanguages = this.rankLanguagesByUsage()
    const immediateLoad = rankedLanguages.slice(0, 2) // Load top 2 immediately
    const deferredLoad = rankedLanguages.slice(2) // Load rest later

    // Load high-priority languages immediately
    await Promise.allSettled(
      immediateLoad.map(lang => this.preloadLanguage(lang))
    )

    // Load remaining languages in background
    if (this.config.enableBackgroundLoading) {
      this.scheduleBackgroundPreload(deferredLoad)
    }

    // Preload completions for frequently used languages
    await preloadCompletions()
  }

  /**
   * Rank languages by usage frequency and patterns
   */
  private rankLanguagesByUsage(): SupportedLanguage[] {
    const now = Date.now()
    const dayInMs = 24 * 60 * 60 * 1000

    return this.config.priority
      .map(language => {
        const usage = this.usagePatterns.get(language)
        if (!usage) {
          return { language, score: 1 } // Default score for unknown languages
        }

        // Calculate score based on multiple factors
        const recencyScore = Math.max(0, 1 - (now - usage.lastUsed) / dayInMs)
        const frequencyScore = Math.min(usage.frequency / 100, 1)
        const contextScore = Math.min(usage.contextSwitchCount / 50, 1)
        const sessionScore = Math.min(usage.averageSessionTime / (10 * 60 * 1000), 1) // 10 minutes max

        const totalScore = recencyScore * 0.3 + frequencyScore * 0.4 + contextScore * 0.2 + sessionScore * 0.1

        return { language, score: totalScore }
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.language)
  }

  /**
   * Schedule preloading during idle time
   */
  private scheduleIdlePreload() {
    if (!('requestIdleCallback' in window)) return

    this.idleCallback = (window as any).requestIdleCallback(
      (deadline: IdleDeadline) => {
        this.preloadDuringIdle(deadline)
      },
      { timeout: 5000 } // Max 5 seconds timeout
    )
  }

  /**
   * Preload languages during idle time
   */
  private async preloadDuringIdle(deadline: IdleDeadline) {
    for (const language of this.config.priority) {
      if (deadline.timeRemaining() < 50) {
        // Not enough time, schedule for next idle period
        this.scheduleIdlePreload()
        break
      }

      if (!isLanguageReady(language)) {
        await this.preloadLanguage(language)
      }
    }
  }

  /**
   * Schedule background preloading for lower-priority languages
   */
  private scheduleBackgroundPreload(languages: SupportedLanguage[]) {
    languages.forEach((language, index) => {
      setTimeout(async () => {
        if (!isLanguageReady(language)) {
          await this.preloadLanguage(language)
        }
      }, 2000 + index * 1000) // Stagger background loads
    })
  }

  /**
   * Preload priority languages
   */
  private async preloadPriority() {
    const priorityLanguages = this.config.priority.slice(0, 2)
    
    await Promise.allSettled(
      priorityLanguages.map(lang => this.preloadLanguage(lang))
    )
  }

  /**
   * Preload a specific language with error handling
   */
  private async preloadLanguage(language: SupportedLanguage): Promise<void> {
    if (this.preloadPromises.has(language)) {
      return this.preloadPromises.get(language)!
    }

    const promise = loadLanguage(language).catch(error => {
      console.warn(`Failed to preload ${language}:`, error)
    })

    this.preloadPromises.set(language, promise)

    try {
      await promise
      console.debug(`Preloaded language: ${language}`)
    } finally {
      this.preloadPromises.delete(language)
    }
  }

  /**
   * Track language usage for intelligent preloading
   */
  trackLanguageUsage(language: SupportedLanguage, sessionStart: number) {
    if (!this.config.trackUsagePatterns) return

    const now = Date.now()
    const sessionTime = now - sessionStart

    const current = this.usagePatterns.get(language) || {
      language,
      frequency: 0,
      lastUsed: 0,
      contextSwitchCount: 0,
      averageSessionTime: 0
    }

    // Update usage statistics
    current.frequency++
    current.lastUsed = now
    current.contextSwitchCount++
    current.averageSessionTime = (current.averageSessionTime + sessionTime) / 2

    this.usagePatterns.set(language, current)
  }

  /**
   * Observe editor element for visibility changes
   */
  observeEditor(element: HTMLElement) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element)
    }
  }

  /**
   * Unobserve editor element
   */
  unobserveEditor(element: HTMLElement) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element)
    }
  }

  /**
   * Save usage patterns to localStorage
   */
  private saveUsagePatterns() {
    if (!this.config.trackUsagePatterns) return

    try {
      const patterns = Object.fromEntries(this.usagePatterns.entries())
      localStorage.setItem('monaco-usage-patterns', JSON.stringify(patterns))
    } catch (error) {
      console.warn('Failed to save usage patterns:', error)
    }
  }

  /**
   * Get preloading statistics
   */
  getStats() {
    return {
      strategy: this.config.strategy,
      isPreloading: this.isPreloading,
      usagePatterns: Object.fromEntries(this.usagePatterns.entries()),
      preloadedLanguages: this.config.priority.filter(isLanguageReady),
      cacheStats: getCacheStats()
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
    }

    if (this.idleCallback && 'cancelIdleCallback' in window) {
      (window as any).cancelIdleCallback(this.idleCallback)
    }

    this.saveUsagePatterns()
    this.preloadPromises.clear()
  }
}

// Global preload manager
export const preloadManager = new PreloadManager()

// Convenience functions
export const startPreloading = (strategy?: PreloadStrategy) => {
  if (strategy) {
    preloadManager.config.strategy = strategy
  }
  return preloadManager.startPreloading()
}

export const observeEditor = (element: HTMLElement) => {
  preloadManager.observeEditor(element)
}

export const trackLanguageUsage = (language: SupportedLanguage, sessionStart: number) => {
  preloadManager.trackLanguageUsage(language, sessionStart)
}

export const getPreloadStats = () => {
  return preloadManager.getStats()
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    preloadManager.destroy()
  })
}