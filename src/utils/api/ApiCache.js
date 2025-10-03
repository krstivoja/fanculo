/**
 * Enhanced API Cache Service - Handles request deduplication, caching, and persistence
 * Prevents redundant API calls and provides centralized data management
 */
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.persistentKeys = new Set([
      "posts",
      "scss-partials",
      "block-categories",
      "registered-blocks",
    ]);
    this.storagePrefix = "fancoolo_cache_";

    // Load persistent cache from localStorage on initialization
    this.loadPersistentCache();

    // Set up cache cleanup interval
    this.setupCleanupInterval();
  }

  /**
   * Generate cache key from endpoint and parameters
   */
  generateKey(endpoint, params = {}) {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${endpoint}:${paramString}`;
  }

  /**
   * Check if cached data is still valid
   */
  isValid(cacheItem) {
    return Date.now() - cacheItem.timestamp < cacheItem.ttl;
  }

  /**
   * Get cached data or execute request with deduplication
   */
  async get(key, requestFn, ttl = this.defaultTTL) {
    // Check if we have valid cached data
    if (this.cache.has(key)) {
      const cacheItem = this.cache.get(key);
      if (this.isValid(cacheItem)) {
        return cacheItem.data;
      }
      // Remove expired cache
      this.cache.delete(key);
    }

    // Check if request is already in progress
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Execute new request
    const requestPromise = requestFn()
      .then((data) => {
        // Cache the result
        const cacheItem = {
          data,
          timestamp: Date.now(),
          ttl,
        };
        this.cache.set(key, cacheItem);

        // Save to persistent storage if applicable
        this.saveToPersistentStorage(key, cacheItem);

        // Remove from pending requests
        this.pendingRequests.delete(key);

        return data;
      })
      .catch((error) => {
        // Remove from pending requests on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key) {
    this.cache.delete(key);
    this.pendingRequests.delete(key);

    // Also remove from localStorage if persistent
    const baseKey = key.split(":")[0];
    if (this.persistentKeys.has(baseKey)) {
      try {
        const storageKey = this.storagePrefix + baseKey;
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn("Failed to remove from localStorage:", error);
      }
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern) {
    // Clear in-memory cache and persistent storage
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);

        // Also remove from localStorage if persistent
        const baseKey = key.split(":")[0];
        if (this.persistentKeys.has(baseKey)) {
          try {
            const storageKey = this.storagePrefix + baseKey;
            localStorage.removeItem(storageKey);
          } catch (error) {
            console.warn("Failed to remove from localStorage:", error);
          }
        }
      }
    }

    // Clear pending requests
    for (const key of this.pendingRequests.keys()) {
      if (key.includes(pattern)) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Load persistent cache from localStorage
   */
  loadPersistentCache() {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
      for (const key of this.persistentKeys) {
        const storageKey = this.storagePrefix + key;
        const cachedData = localStorage.getItem(storageKey);

        if (cachedData) {
          const { data, timestamp, ttl } = JSON.parse(cachedData);
          const cacheItem = { data, timestamp, ttl };

          // Only load if still valid
          if (this.isValid(cacheItem)) {
            this.cache.set(key, cacheItem);
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load persistent cache:", error);
    }
  }

  /**
   * Save to persistent storage if key is persistent
   */
  saveToPersistentStorage(key, cacheItem) {
    if (typeof window === "undefined" || !window.localStorage) return;

    const baseKey = key.split(":")[0];
    if (this.persistentKeys.has(baseKey)) {
      try {
        const storageKey = this.storagePrefix + baseKey;
        localStorage.setItem(storageKey, JSON.stringify(cacheItem));
      } catch (error) {
        console.warn("Failed to save to persistent storage:", error);
      }
    }
  }

  /**
   * Set up automatic cache cleanup
   */
  setupCleanupInterval() {
    if (typeof window === "undefined") return;

    // Clean expired cache entries every 10 minutes
    setInterval(
      () => {
        this.cleanExpiredEntries();
      },
      10 * 60 * 1000
    );
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredEntries() {
    for (const [key, cacheItem] of this.cache.entries()) {
      if (!this.isValid(cacheItem)) {
        this.cache.delete(key);

        // Also remove from localStorage if persistent
        const baseKey = key.split(":")[0];
        if (this.persistentKeys.has(baseKey)) {
          try {
            localStorage.removeItem(this.storagePrefix + baseKey);
          } catch (error) {
            console.warn("Failed to remove expired persistent cache:", error);
          }
        }
      }
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(warmingFunctions) {
    const promises = Object.entries(warmingFunctions).map(([key, fn]) => {
      if (!this.cache.has(key)) {
        return this.get(key, fn).catch((error) => {
          console.warn(`Cache warming failed for ${key}:`, error);
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics with persistent data info
   */
  getStats() {
    const persistentCount = Array.from(this.cache.keys()).filter((key) =>
      this.persistentKeys.has(key.split(":")[0])
    ).length;

    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      persistentEntries: persistentCount,
      keys: Array.from(this.cache.keys()),
      persistentKeys: Array.from(this.persistentKeys),
    };
  }
}

// Create singleton instance
const apiCache = new ApiCache();

export default apiCache;
