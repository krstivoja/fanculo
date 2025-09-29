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
    }, 2 * 60 * 1000); // Shorter TTL for post data (2 minutes)
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
    this.cache.invalidatePattern('posts');
    this.cache.invalidatePattern('scss-partials');

    return result;
  }

  /**
   * Update post - invalidates relevant caches
   */
  async updatePost(postId, postData) {
    const result = await this.apiClient.updatePost(postId, postData);

    // Invalidate related caches
    this.cache.invalidate(this.cache.generateKey('post-with-related', { postId }));
    this.cache.invalidatePattern('posts');
    this.cache.invalidatePattern('scss-partials');

    return result;
  }

  /**
   * Delete post - invalidates relevant caches (optimized)
   */
  async deletePost(postId) {
    const result = await this.apiClient.deletePost(postId);

    // Invalidate only specific caches to avoid performance issues
    this.cache.invalidate(this.cache.generateKey('post-with-related', { postId }));
    this.cache.invalidate(this.cache.generateKey('post', { postId }));
    this.cache.invalidatePattern('posts');

    return result;
  }

  /**
   * Save post with operations - invalidates relevant caches
   */
  async savePostWithOperations(postId, metaData, generateFiles = false) {
    const result = await this.apiClient.savePostWithOperations(postId, metaData, generateFiles);

    // Invalidate related caches
    this.cache.invalidate(this.cache.generateKey('post-with-related', { postId }));
    this.cache.invalidatePattern('posts');

    return result;
  }

  /**
   * Force regenerate all - invalidates all caches since files change
   */
  async forceRegenerateAll() {
    const result = await this.apiClient.forceRegenerateAll();

    // Clear all caches since regeneration affects many things
    this.cache.clear();

    return result;
  }

  /**
   * Save SCSS content - invalidates SCSS-related caches
   */
  async saveScssContent(postId, scssData) {
    const result = await this.apiClient.saveScssContent(postId, scssData);

    // Invalidate SCSS-related caches
    this.cache.invalidatePattern('scss-partials');
    this.cache.invalidate(this.cache.generateKey('post-with-related', { postId }));

    return result;
  }

  /**
   * Save editor SCSS content - invalidates SCSS-related caches
   */
  async saveEditorScssContent(postId, scssData) {
    const result = await this.apiClient.saveEditorScssContent(postId, scssData);

    // Invalidate SCSS-related caches
    this.cache.invalidatePattern('scss-partials');
    this.cache.invalidate(this.cache.generateKey('post-with-related', { postId }));

    return result;
  }

  /**
   * Regenerate files - clear caches since files change
   */
  async regenerateFiles() {
    const result = await this.apiClient.regenerateFiles();

    // Clear relevant caches
    this.cache.clear();

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
  }
}

// Create singleton instance
const centralizedApi = new CentralizedApiService();

export default centralizedApi;