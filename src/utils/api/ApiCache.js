/**
 * API Cache Service - Handles request deduplication and caching
 * Prevents redundant API calls and provides centralized data management
 */
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
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
      .then(data => {
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl
        });

        // Remove from pending requests
        this.pendingRequests.delete(key);

        return data;
      })
      .catch(error => {
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
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
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
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const apiCache = new ApiCache();

export default apiCache;