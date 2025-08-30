/**
 * Monaco Editor Memory Manager
 * Monitors and optimizes memory usage for Monaco Editor instances
 */

interface MemoryStats {
  totalJSHeapSize: number
  usedJSHeapSize: number
  jsHeapSizeLimit: number
}

interface MonacoMemoryData {
  instances: number
  models: number
  editors: number
  estimatedMemory: number
  lastCleanup: number
}

class MemoryManager {
  private memoryLimit = 100 * 1024 * 1024 // 100MB limit for Monaco
  private cleanupThreshold = 0.8 // Cleanup when 80% of limit is reached
  private monitoringInterval: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  private memoryHistory: number[] = []
  private maxHistorySize = 30 // Keep 30 samples
  private isMonitoring = false
  private callbacks: Array<(stats: any) => void> = []

  constructor() {
    // Temporarily disable memory monitoring for debugging
    // this.startMonitoring()
  }

  private startMonitoring(): void {
    if (!this.supportsMemoryAPI() || this.isMonitoring) return

    this.isMonitoring = true
    
    // Monitor memory every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage()
    }, 5000)

    // Aggressive cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, 30000)

    // Listen for memory pressure events
    if ('memory' in performance) {
      this.setupMemoryPressureHandling()
    }

    console.debug('Memory manager started')
  }

  private supportsMemoryAPI(): boolean {
    return 'memory' in performance && typeof (performance as any).memory === 'object'
  }

  private getMemoryStats(): MemoryStats | null {
    if (!this.supportsMemoryAPI()) return null
    
    const memory = (performance as any).memory
    return {
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    }
  }

  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats()
    if (!stats) return

    // Track memory usage over time
    this.memoryHistory.push(stats.usedJSHeapSize)
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift()
    }

    // Calculate memory pressure
    const memoryPressure = stats.usedJSHeapSize / stats.jsHeapSizeLimit
    const monacoMemory = this.estimateMonacoMemoryUsage()
    const monacoMemoryPressure = monacoMemory.estimatedMemory / this.memoryLimit

    // Notify callbacks
    const memoryInfo = {
      ...stats,
      memoryPressure,
      monacoMemory,
      monacoMemoryPressure,
      trend: this.calculateMemoryTrend()
    }

    this.callbacks.forEach(callback => {
      try {
        callback(memoryInfo)
      } catch (error) {
        console.warn('Memory callback error:', error)
      }
    })

    // Trigger cleanup if needed
    if (memoryPressure > this.cleanupThreshold || monacoMemoryPressure > this.cleanupThreshold) {
      console.warn('Memory pressure detected, triggering cleanup', {
        memoryPressure: Math.round(memoryPressure * 100) + '%',
        monacoMemoryPressure: Math.round(monacoMemoryPressure * 100) + '%'
      })
      this.performEmergencyCleanup()
    }
  }

  private calculateMemoryTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.memoryHistory.length < 5) return 'stable'

    const recent = this.memoryHistory.slice(-5)
    const older = this.memoryHistory.slice(-10, -5)
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

    const diff = (recentAvg - olderAvg) / olderAvg

    if (diff > 0.05) return 'increasing'
    if (diff < -0.05) return 'decreasing'
    return 'stable'
  }

  private estimateMonacoMemoryUsage(): MonacoMemoryData {
    // This is an estimation since we can't directly measure Monaco's memory
    let instances = 0
    let models = 0
    let editors = 0
    let estimatedMemory = 0

    // Get Monaco instances from global registry if available
    if (typeof window !== 'undefined' && (window as any).monacoEditorInstances) {
      const monacoInstances = (window as any).monacoEditorInstances
      instances = Object.keys(monacoInstances).length
      
      Object.values(monacoInstances).forEach((instance: any) => {
        if (instance.editor) {
          editors++
          estimatedMemory += 10 * 1024 * 1024 // Estimate 10MB per editor
        }
        if (instance.monaco && instance.monaco.editor) {
          const allModels = instance.monaco.editor.getModels()
          models += allModels.length
          estimatedMemory += allModels.length * 1024 * 1024 // Estimate 1MB per model
        }
      })
    }

    // Base Monaco runtime overhead
    if (instances > 0) {
      estimatedMemory += 20 * 1024 * 1024 // 20MB base overhead
    }

    return {
      instances,
      models,
      editors,
      estimatedMemory,
      lastCleanup: Date.now()
    }
  }

  private performCleanup(): void {
    if (typeof window === 'undefined') return

    // Cleanup unused models
    this.cleanupUnusedModels()
    
    // Cleanup completion caches
    this.cleanupCompletionCaches()
    
    // Force garbage collection if available (development only)
    if ((window as any).gc && process.env.NODE_ENV === 'development') {
      try {
        (window as any).gc()
        console.debug('Forced garbage collection')
      } catch (error) {
        // GC might not be available
      }
    }

    console.debug('Regular memory cleanup completed')
  }

  private performEmergencyCleanup(): void {
    console.warn('Performing emergency memory cleanup')

    // More aggressive cleanup
    this.cleanupUnusedModels(true)
    this.cleanupCompletionCaches()
    this.disposeIdleInstances()
    
    // Clear memory history to reset trend calculation
    this.memoryHistory = []

    // Request idle callback for additional cleanup
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        this.performDeepCleanup()
      }, { timeout: 5000 })
    }
  }

  private cleanupUnusedModels(aggressive = false): void {
    if (typeof window === 'undefined') return

    const monacoInstances = (window as any).monacoEditorInstances
    if (!monacoInstances) return

    let modelsCleared = 0

    Object.values(monacoInstances).forEach((instance: any) => {
      if (!instance.monaco || !instance.monaco.editor) return

      const allModels = instance.monaco.editor.getModels()
      const activeEditors = Object.values(monacoInstances)
        .map((inst: any) => inst.editor)
        .filter(Boolean)

      allModels.forEach((model: any) => {
        const isActive = activeEditors.some((editor: any) => 
          editor.getModel() === model
        )

        // In aggressive mode, also clean models not accessed recently
        const shouldCleanup = !isActive || (aggressive && this.isModelStale(model))

        if (shouldCleanup) {
          try {
            model.dispose()
            modelsCleared++
          } catch (error) {
            console.warn('Error disposing model:', error)
          }
        }
      })
    })

    if (modelsCleared > 0) {
      console.debug(`Cleaned up ${modelsCleared} unused models`)
    }
  }

  private isModelStale(model: any): boolean {
    // Consider a model stale if it hasn't been accessed in 5 minutes
    const lastAccess = model._lastAccessed || 0
    return Date.now() - lastAccess > 5 * 60 * 1000
  }

  private cleanupCompletionCaches(): void {
    // Clear completion caches from our cache manager
    try {
      const { clearAllCaches } = require('./completionCache')
      clearAllCaches()
      console.debug('Cleared completion caches')
    } catch (error) {
      // Cache manager might not be available
    }
  }

  private disposeIdleInstances(): void {
    if (typeof window === 'undefined') return

    const monacoInstances = (window as any).monacoEditorInstances
    if (!monacoInstances) return

    let instancesDisposed = 0

    Object.entries(monacoInstances).forEach(([key, instance]: [string, any]) => {
      if (!instance.isActive && Date.now() - instance.lastUsed > 2 * 60 * 1000) { // 2 minutes idle
        try {
          if (instance.editor) {
            instance.editor.dispose()
          }
          delete monacoInstances[key]
          instancesDisposed++
        } catch (error) {
          console.warn('Error disposing idle instance:', error)
        }
      }
    })

    if (instancesDisposed > 0) {
      console.debug(`Disposed ${instancesDisposed} idle instances`)
    }
  }

  private performDeepCleanup(): void {
    console.debug('Performing deep memory cleanup')

    // Clear any remaining event listeners
    this.clearEventListeners()
    
    // Clear browser caches if possible
    this.clearBrowserCaches()
  }

  private clearEventListeners(): void {
    // Remove any lingering Monaco event listeners
    if (typeof window !== 'undefined' && (window as any).monacoEventListeners) {
      const listeners = (window as any).monacoEventListeners
      listeners.forEach((listener: any) => {
        try {
          if (listener.dispose) {
            listener.dispose()
          }
        } catch (error) {
          console.warn('Error disposing event listener:', error)
        }
      })
      ;(window as any).monacoEventListeners = []
    }
  }

  private clearBrowserCaches(): void {
    // Clear any browser-level caches if API is available
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('monaco')) {
            caches.delete(cacheName)
          }
        })
      }).catch(() => {
        // Cache API might not be fully supported
      })
    }
  }

  private setupMemoryPressureHandling(): void {
    // Listen for memory pressure events (experimental)
    if ('onmemory' in window) {
      (window as any).addEventListener('memory', (event: any) => {
        console.warn('Memory pressure event detected:', event)
        this.performEmergencyCleanup()
      })
    }

    // Listen for low memory warnings
    if ('onlowmemory' in window) {
      (window as any).addEventListener('lowmemory', () => {
        console.warn('Low memory warning detected')
        this.performEmergencyCleanup()
      })
    }
  }

  // Public API
  onMemoryChange(callback: (stats: any) => void): () => void {
    this.callbacks.push(callback)
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  getCurrentMemoryStats(): any {
    return {
      system: this.getMemoryStats(),
      monaco: this.estimateMonacoMemoryUsage(),
      trend: this.calculateMemoryTrend(),
      history: [...this.memoryHistory]
    }
  }

  forceCleanup(): void {
    this.performEmergencyCleanup()
  }

  setMemoryLimit(limitInMB: number): void {
    this.memoryLimit = limitInMB * 1024 * 1024
  }

  getMemoryLimit(): number {
    return this.memoryLimit / (1024 * 1024) // Return in MB
  }

  destroy(): void {
    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    this.callbacks = []
    this.memoryHistory = []
    
    console.debug('Memory manager destroyed')
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager()

// Utility functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getMemoryPressureLevel(pressure: number): 'low' | 'medium' | 'high' | 'critical' {
  if (pressure < 0.5) return 'low'
  if (pressure < 0.7) return 'medium'
  if (pressure < 0.9) return 'high'
  return 'critical'
}

// Setup global Monaco instance tracking
if (typeof window !== 'undefined') {
  if (!(window as any).monacoEditorInstances) {
    ;(window as any).monacoEditorInstances = {}
  }
  
  if (!(window as any).monacoEventListeners) {
    ;(window as any).monacoEventListeners = []
  }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.destroy()
  })
}