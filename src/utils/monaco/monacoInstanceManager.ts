/**
 * Monaco Instance Manager
 * Manages Monaco Editor instances with aggressive caching and reuse
 */

import { memoryManager } from './memoryManager'

interface CachedInstance {
  editor: any
  monaco: any
  container?: HTMLElement
  language: string
  lastUsed: number
  isActive: boolean
  memoryFootprint: number
  createdAt: number
  accessCount: number
}

class MonacoInstanceManager {
  private instances = new Map<string, CachedInstance>()
  private maxInstances = 2 // Reduced for better memory management
  private cleanupInterval: NodeJS.Timeout | null = null
  private memoryCheckInterval: NodeJS.Timeout | null = null
  private monacoLoaded = false
  private monacoPromise: Promise<any> | null = null
  private totalMemoryUsage = 0
  private memoryLimit = 50 * 1024 * 1024 // 50MB limit for all instances

  constructor() {
    this.startCleanup()
    this.startMemoryMonitoring()
    this.preloadMonaco()
    this.setupMemoryPressureHandling()
  }

  private async preloadMonaco() {
    if (this.monacoLoaded || this.monacoPromise) return this.monacoPromise

    this.monacoPromise = new Promise(async (resolve) => {
      try {
        // Preload Monaco Editor module
        const { default: Editor } = await import('@monaco-editor/react')
        
        // Create a hidden container to initialize Monaco
        const hiddenContainer = document.createElement('div')
        hiddenContainer.style.position = 'absolute'
        hiddenContainer.style.left = '-9999px'
        hiddenContainer.style.width = '100px'
        hiddenContainer.style.height = '100px'
        document.body.appendChild(hiddenContainer)

        // Initialize Monaco to load core modules
        const loadMonaco = () => {
          return new Promise((resolveMonaco) => {
            const editorRef = { current: null }
            
            // This will trigger Monaco loading
            import('@monaco-editor/react').then((module) => {
              // Monaco is now loaded in memory
              this.monacoLoaded = true
              document.body.removeChild(hiddenContainer)
              resolveMonaco(module)
            })
          })
        }

        await loadMonaco()
        resolve(true)
        console.debug('Monaco preloaded successfully')
      } catch (error) {
        console.error('Failed to preload Monaco:', error)
        resolve(false)
      }
    })

    return this.monacoPromise
  }

  async getOrCreateInstance(language: string, container: HTMLElement): Promise<CachedInstance | null> {
    const key = `${language}`
    
    // Check memory pressure before creating new instances
    if (this.totalMemoryUsage > this.memoryLimit * 0.8) {
      console.warn('Memory pressure detected, cleaning up before creating instance')
      await this.performMemoryCleanup()
    }
    
    // Check if we have a cached instance for this language
    let instance = this.instances.get(key)
    
    if (instance && !instance.isActive) {
      // Reuse existing instance
      instance.container = container
      instance.lastUsed = Date.now()
      instance.isActive = true
      instance.accessCount++
      
      // Move editor to new container if different
      if (instance.editor && instance.editor.getDomNode()) {
        const editorDom = instance.editor.getDomNode()
        if (editorDom && editorDom.parentNode !== container) {
          container.appendChild(editorDom)
        }
      }
      
      // Track in global registry
      this.registerInstanceGlobally(key, instance)
      
      console.debug(`Reused Monaco instance for ${language} (access #${instance.accessCount})`)
      return instance
    }

    // Check if we can create new instance within memory limits
    if (this.totalMemoryUsage > this.memoryLimit || this.instances.size >= this.maxInstances) {
      // Try to cleanup and then create
      await this.performMemoryCleanup()
      
      if (this.totalMemoryUsage > this.memoryLimit) {
        console.error('Cannot create new Monaco instance: memory limit exceeded')
        return null
      }
    }

    // Create new instance if none available or all are active
    try {
      await this.preloadMonaco() // Ensure Monaco is loaded
      
      const estimatedMemory = this.estimateInstanceMemory(language)
      
      const newInstance: CachedInstance = {
        editor: null,
        monaco: null,
        container,
        language,
        lastUsed: Date.now(),
        isActive: true,
        memoryFootprint: estimatedMemory,
        createdAt: Date.now(),
        accessCount: 1
      }

      this.instances.set(key, newInstance)
      this.totalMemoryUsage += estimatedMemory
      
      // Track in global registry
      this.registerInstanceGlobally(key, newInstance)
      
      console.debug(`Created new Monaco instance for ${language} (estimated ${Math.round(estimatedMemory / 1024 / 1024)}MB)`)
      return newInstance
    } catch (error) {
      console.error('Failed to create Monaco instance:', error)
      return null
    }
  }

  setInstanceReferences(language: string, editor: any, monaco: any) {
    const instance = this.instances.get(language)
    if (instance) {
      instance.editor = editor
      instance.monaco = monaco
      instance.lastUsed = Date.now()
      
      // Update memory footprint after editor is created
      instance.memoryFootprint = this.measureActualMemoryUsage(instance)
      
      // Setup model tracking for memory management
      this.setupModelTracking(instance)
    }
  }

  private estimateInstanceMemory(language: string): number {
    // Base Monaco overhead
    let memory = 15 * 1024 * 1024 // 15MB base

    // Language-specific overhead
    switch (language) {
      case 'php':
        memory += 8 * 1024 * 1024 // 8MB for PHP language features
        break
      case 'scss':
        memory += 5 * 1024 * 1024 // 5MB for SCSS language features
        break
      default:
        memory += 3 * 1024 * 1024 // 3MB for basic language
    }

    return memory
  }

  private measureActualMemoryUsage(instance: CachedInstance): number {
    let memory = instance.memoryFootprint

    // Add memory for models
    if (instance.monaco && instance.monaco.editor) {
      const models = instance.monaco.editor.getModels()
      memory += models.length * 2 * 1024 * 1024 // Estimate 2MB per model
    }

    return memory
  }

  private registerInstanceGlobally(key: string, instance: CachedInstance) {
    if (typeof window !== 'undefined') {
      if (!(window as any).monacoEditorInstances) {
        ;(window as any).monacoEditorInstances = {}
      }
      ;(window as any).monacoEditorInstances[key] = {
        ...instance,
        lastUsed: Date.now(),
        isActive: instance.isActive
      }
    }
  }

  private setupModelTracking(instance: CachedInstance) {
    if (!instance.monaco || !instance.monaco.editor) return

    // Track model creation and disposal
    const originalCreateModel = instance.monaco.editor.createModel
    instance.monaco.editor.createModel = (...args: any[]) => {
      const model = originalCreateModel.apply(instance.monaco.editor, args)
      
      // Track model access time
      model._lastAccessed = Date.now()
      
      // Override getValue to track access
      const originalGetValue = model.getValue
      model.getValue = function() {
        model._lastAccessed = Date.now()
        return originalGetValue.apply(this, arguments)
      }

      // Update memory usage
      instance.memoryFootprint += 2 * 1024 * 1024 // Estimate 2MB per model
      this.totalMemoryUsage += 2 * 1024 * 1024

      return model
    }
  }

  private startMemoryMonitoring() {
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage()
    }, 10000) // Check every 10 seconds
  }

  private checkMemoryUsage() {
    const stats = memoryManager.getCurrentMemoryStats()
    
    if (stats.system) {
      const pressure = stats.system.usedJSHeapSize / stats.system.jsHeapSizeLimit
      
      if (pressure > 0.8) {
        console.warn('High system memory pressure detected, performing cleanup')
        this.performMemoryCleanup()
      }
    }

    // Check Monaco-specific memory usage
    if (this.totalMemoryUsage > this.memoryLimit * 0.9) {
      console.warn('Monaco memory limit approaching, performing cleanup')
      this.performMemoryCleanup()
    }
  }

  private async performMemoryCleanup(): Promise<void> {
    console.debug('Performing Monaco memory cleanup')
    
    // Find least recently used inactive instances
    const inactiveInstances = Array.from(this.instances.entries())
      .filter(([_, instance]) => !instance.isActive)
      .sort(([_, a], [__, b]) => a.lastUsed - b.lastUsed)

    // Dispose oldest inactive instances
    for (const [key, instance] of inactiveInstances.slice(0, Math.ceil(inactiveInstances.length / 2))) {
      await this.disposeInstance(key, instance)
    }

    // Clean up models in active instances
    for (const [_, instance] of this.instances.entries()) {
      if (instance.monaco && instance.monaco.editor) {
        this.cleanupStaleModels(instance)
      }
    }

    // Force garbage collection if available (development)
    if (typeof window !== 'undefined' && (window as any).gc && process.env.NODE_ENV === 'development') {
      try {
        (window as any).gc()
      } catch {}
    }
  }

  private async disposeInstance(key: string, instance: CachedInstance): Promise<void> {
    try {
      if (instance.editor) {
        instance.editor.dispose()
      }
      
      // Clean up models
      if (instance.monaco && instance.monaco.editor) {
        const models = instance.monaco.editor.getModels()
        models.forEach((model: any) => {
          try {
            model.dispose()
          } catch (error) {
            console.warn('Error disposing model:', error)
          }
        })
      }

      this.totalMemoryUsage -= instance.memoryFootprint
      this.instances.delete(key)

      // Remove from global registry
      if (typeof window !== 'undefined' && (window as any).monacoEditorInstances) {
        delete (window as any).monacoEditorInstances[key]
      }

      console.debug(`Disposed Monaco instance: ${key}`)
    } catch (error) {
      console.error('Error disposing Monaco instance:', error)
    }
  }

  private cleanupStaleModels(instance: CachedInstance) {
    if (!instance.monaco || !instance.monaco.editor) return

    const models = instance.monaco.editor.getModels()
    const now = Date.now()
    let modelsDisposed = 0

    models.forEach((model: any) => {
      const lastAccess = model._lastAccessed || 0
      const isStale = now - lastAccess > 5 * 60 * 1000 // 5 minutes
      
      if (isStale && instance.editor.getModel() !== model) {
        try {
          model.dispose()
          instance.memoryFootprint -= 2 * 1024 * 1024
          this.totalMemoryUsage -= 2 * 1024 * 1024
          modelsDisposed++
        } catch (error) {
          console.warn('Error disposing stale model:', error)
        }
      }
    })

    if (modelsDisposed > 0) {
      console.debug(`Cleaned up ${modelsDisposed} stale models from ${instance.language} instance`)
    }
  }

  private setupMemoryPressureHandling() {
    // Listen to memory manager events
    memoryManager.onMemoryChange((stats) => {
      if (stats.memoryPressure > 0.8 || stats.monacoMemoryPressure > 0.8) {
        this.performMemoryCleanup()
      }
    })
  }

  releaseInstance(language: string) {
    const instance = this.instances.get(language)
    if (instance) {
      instance.isActive = false
      instance.container = undefined
      instance.lastUsed = Date.now()
      
      // Update global registry
      if (typeof window !== 'undefined' && (window as any).monacoEditorInstances?.[language]) {
        ;(window as any).monacoEditorInstances[language].isActive = false
        ;(window as any).monacoEditorInstances[language].lastUsed = Date.now()
      }
    }
  }

  private async cleanupOldestInstance() {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, instance] of this.instances.entries()) {
      if (!instance.isActive && instance.lastUsed < oldestTime) {
        oldestTime = instance.lastUsed
        oldestKey = key
      }
    }

    if (oldestKey) {
      const instance = this.instances.get(oldestKey)
      if (instance) {
        await this.disposeInstance(oldestKey, instance)
      }
    }
  }

  private startCleanup() {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const maxAge = 10 * 60 * 1000 // 10 minutes

      for (const [key, instance] of this.instances.entries()) {
        if (!instance.isActive && now - instance.lastUsed > maxAge) {
          if (instance.editor) {
            try {
              instance.editor.dispose()
            } catch (error) {
              console.warn('Error disposing stale Monaco instance:', error)
            }
          }
          this.instances.delete(key)
          console.debug(`Cleaned up stale Monaco instance: ${key}`)
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  getStats() {
    const memoryStats = memoryManager.getCurrentMemoryStats()
    
    return {
      totalInstances: this.instances.size,
      activeInstances: Array.from(this.instances.values()).filter(i => i.isActive).length,
      monacoLoaded: this.monacoLoaded,
      totalMemoryUsage: this.totalMemoryUsage,
      memoryLimit: this.memoryLimit,
      memoryPressure: this.totalMemoryUsage / this.memoryLimit,
      systemMemory: memoryStats.system,
      instances: Array.from(this.instances.entries()).map(([key, instance]) => ({
        language: key,
        active: instance.isActive,
        lastUsed: instance.lastUsed,
        age: Date.now() - instance.lastUsed,
        createdAt: instance.createdAt,
        accessCount: instance.accessCount,
        memoryFootprint: instance.memoryFootprint,
        memoryMB: Math.round(instance.memoryFootprint / 1024 / 1024)
      }))
    }
  }

  // Public method to force cleanup
  forceCleanup(): Promise<void> {
    return this.performMemoryCleanup()
  }

  // Public method to get memory usage
  getMemoryUsage(): { total: number, limit: number, pressure: number } {
    return {
      total: this.totalMemoryUsage,
      limit: this.memoryLimit,
      pressure: this.totalMemoryUsage / this.memoryLimit
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
    }

    // Dispose all instances properly
    const disposalPromises = Array.from(this.instances.entries()).map(([key, instance]) =>
      this.disposeInstance(key, instance)
    )

    Promise.all(disposalPromises).finally(() => {
      this.instances.clear()
      this.totalMemoryUsage = 0
      
      // Clean up global registry
      if (typeof window !== 'undefined' && (window as any).monacoEditorInstances) {
        ;(window as any).monacoEditorInstances = {}
      }
    })
  }
}

// Global instance manager
export const monacoInstanceManager = new MonacoInstanceManager()

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    monacoInstanceManager.destroy()
  })
}