import { apiClient } from '../index';
import apiCache from './ApiCache';

/**
 * Centralized API Service with caching and deduplication
 * Provides optimized data fetching for commonly used endpoints
 */
class CentralizedApiService {
  constructor() {
    this.apiClient = apiClient;
    this.cache = apiCache;
  }

  /**
   * Get all posts with caching and deduplication
   */
  async getPosts(params = { per_page: 100 }) {
    const key = this.cache.generateKey('posts', params);

    return this.cache.get(key, async () => {
      const data = await this.apiClient.getPosts(params);
      return data;
    });
  }

  /**
   * Get SCSS partials with caching and deduplication
   */
  async getScssPartials() {
    const key = this.cache.generateKey('scss-partials');

    return this.cache.get(key, async () => {
      const data = await this.apiClient.getScssPartials();
      return data;
    });
  }

  /**
   * Get registered blocks with caching and deduplication
   */
  async getRegisteredBlocks() {
    const key = this.cache.generateKey('registered-blocks');

    return this.cache.get(key, async () => {
      const data = await this.apiClient.getRegisteredBlocks();
      return data;
    });
  }

  /**
   * Get block categories with caching and deduplication
   */
  async getBlockCategories() {
    const key = this.cache.generateKey('block-categories');

    return this.cache.get(key, async () => {
      const data = await this.apiClient.getBlockCategories();
      return data;
    });
  }

  /**
   * Get single post with caching
   */
  async getPost(postId) {
    const key = this.cache.generateKey('post', { postId });

    return this.cache.get(key, async () => {
      const data = await this.apiClient.getPost(postId);
      return data;
    }, 2 * 60 * 1000); // Shorter TTL for post data (2 minutes)
  }

  /**
   * Get post with related data - with caching
   */
  async getPostWithRelated(postId) {
    const key = this.cache.generateKey('post-with-related', { postId });

    return this.cache.get(key, async () => {
      const data = await this.apiClient.getPostWithRelated(postId);
      return data;
    }, 5 * 1000); // Very short TTL (5 seconds) to ensure fresh data after saves
  }

  /**
   * Batch get posts with related data
   */
  async getBatchPostsWithRelated(postIds) {
    const key = this.cache.generateKey('batch-posts-with-related', { postIds: postIds.sort() });

    return this.cache.get(key, async () => {
      // Use Promise.all for parallel requests
      const promises = postIds.map(id => this.getPostWithRelated(id));
      const results = await Promise.all(promises);

      // Return as object with post IDs as keys
      const batchResult = {};
      postIds.forEach((id, index) => {
        batchResult[id] = results[index];
      });

      return batchResult;
    }, 2 * 60 * 1000); // Shorter TTL for post data
  }

  /**
   * Create post - invalidates relevant caches
   */
  async createPost(postData) {
    const result = await this.apiClient.createPost(postData);

    // Invalidate related caches
    this.invalidatePostsCollectionCaches();
    this.invalidateScssPartialCaches();

    return result;
  }

  /**
   * Update post - invalidates relevant caches
   */
  async updatePost(postId, postData) {
    const result = await this.apiClient.updatePost(postId, postData);

    // Invalidate related caches
    this.invalidatePostCaches(postId);
    this.invalidatePostsCollectionCaches();
    this.invalidateScssPartialCaches();

    return result;
  }

  /**
   * Delete post - invalidates relevant caches (optimized)
   */
  async deletePost(postId) {
    const result = await this.apiClient.deletePost(postId);

    // Invalidate only specific caches to avoid performance issues
    this.invalidatePostCaches(postId);
    this.invalidatePostsCollectionCaches();

    return result;
  }

  /**
   * Save post with operations - invalidates relevant caches
   * @param {number} postId - Post ID to save
   * @param {Object} metaData - Meta data to save
   * @param {boolean} generateFiles - Whether to regenerate files
   * @param {Object} options - Additional options
   * @param {boolean} options.invalidateCollectionCache - Whether to invalidate posts collection cache (default: true)
   */
  async savePostWithOperations(postId, metaData, generateFiles = false, options = {}) {
    const { invalidateCollectionCache = true } = options;

    const result = await this.apiClient.savePostWithOperations(postId, metaData, generateFiles);

    // Always invalidate individual post caches (detail view must be fresh)
    this.invalidatePostCaches(postId);

    // Only invalidate collection cache if list-visible metadata changed
    // This keeps the posts list cache hot when only editing content/meta that doesn't affect the list
    if (invalidateCollectionCache) {
      this.invalidatePostsCollectionCaches();
    }

    // Always invalidate SCSS partials cache (meta changes may affect partials)
    this.invalidateScssPartialCaches();

    return result;
  }

  /**
   * Force regenerate all - invalidates all caches since files change
   */
  async forceRegenerateAll() {
    const result = await this.apiClient.forceRegenerateAll();

    // Clear all caches since regeneration affects many things
    this.cache.clear();
    if (this.apiClient?.clearCache) {
      this.apiClient.clearCache();
    }

    return result;
  }

  /**
   * Save SCSS content - invalidates SCSS-related caches
   */
  async saveScssContent(postId, scssData) {
    const result = await this.apiClient.saveScssContent(postId, scssData);

    // Invalidate SCSS-related caches
    this.invalidateScssPartialCaches();
    this.invalidatePostCaches(postId);

    return result;
  }

  /**
   * Save editor SCSS content - invalidates SCSS-related caches
   */
  async saveEditorScssContent(postId, scssData) {
    const result = await this.apiClient.saveEditorScssContent(postId, scssData);

    // Invalidate SCSS-related caches
    this.invalidateScssPartialCaches();
    this.invalidatePostCaches(postId);

    return result;
  }

  /**
   * Regenerate files - clear caches since files change
   */
  async regenerateFiles() {
    const result = await this.apiClient.regenerateFiles();

    // Clear relevant caches
    this.cache.clear();
    if (this.apiClient?.clearCache) {
      this.apiClient.clearCache();
    }

    return result;
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache() {
    const warmingFunctions = {
      'posts': () => this.apiClient.getPosts({ per_page: 100 }),
      'scss-partials': () => this.apiClient.getScssPartials(),
      'registered-blocks': () => this.apiClient.getRegisteredBlocks(),
      'block-categories': () => this.apiClient.getBlockCategories()
    };

    await this.cache.warmCache(warmingFunctions);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Manually clear cache
   */
  clearCache() {
    this.cache.clear();
    if (this.apiClient?.clearCache) {
      this.apiClient.clearCache();
    }
  }

  invalidatePostCaches(postId) {
    if (!postId) {
      return;
    }

    const relatedKey = this.cache.generateKey('post-with-related', { postId });
    const postKey = this.cache.generateKey('post', { postId });

    this.cache.invalidate(relatedKey);
    this.cache.invalidate(postKey);

    if (this.apiClient?.invalidateCache) {
      this.apiClient.invalidateCache(`/post/${postId}/with-related`);
      this.apiClient.invalidateCache(`/post/${postId}`);
    }
  }

  invalidatePostsCollectionCaches() {
    this.cache.invalidatePattern('posts');
    if (this.apiClient?.invalidateCache) {
      this.apiClient.invalidateCache('/posts');
    }
  }

  invalidateScssPartialCaches() {
    this.cache.invalidatePattern('scss-partials');
    if (this.apiClient?.invalidateCache) {
      this.apiClient.invalidateCache('/scss-partials');
    }
  }
}

// Create singleton instance
const centralizedApi = new CentralizedApiService();

export default centralizedApi;
