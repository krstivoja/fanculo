<?php

namespace Fanculo\Admin\Api\Traits;

/**
 * Caching Integration Trait
 *
 * Provides consistent caching patterns and integration points for
 * API operations. Standardizes cache key generation, invalidation
 * strategies, and cache warming techniques.
 */
trait CachingIntegrationTrait
{
    /** @var array Cache configuration */
    private array $cacheConfig = [
        'default_ttl' => 300, // 5 minutes
        'key_prefix' => 'fanculo_api_',
        'use_object_cache' => true,
        'use_transients' => true,
    ];

    /** @var array Cache statistics */
    private array $cacheStats = [
        'hits' => 0,
        'misses' => 0,
        'sets' => 0,
        'deletes' => 0,
    ];

    /**
     * Get data from cache or execute callback to generate it
     *
     * @param string $cache_key Unique cache key
     * @param callable $callback Function to generate data if not cached
     * @param int $ttl Time to live in seconds (0 = never expires)
     * @param array $options Caching options
     * @return mixed Cached or generated data
     */
    protected function fetchWithCache(string $cache_key, callable $callback, int $ttl = 0, array $options = []): mixed
    {
        $full_key = $this->buildCacheKey($cache_key, $options);
        $ttl = $ttl ?: $this->cacheConfig['default_ttl'];

        // Try to get from cache
        $cached_data = $this->getFromCache($full_key, $options);

        if ($cached_data !== false) {
            $this->cacheStats['hits']++;
            return $cached_data;
        }

        $this->cacheStats['misses']++;

        // Generate data using callback
        $data = $callback();

        // Cache the generated data
        $this->setCache($full_key, $data, $ttl, $options);

        return $data;
    }

    /**
     * Cache bulk operation results
     *
     * @param string $operation_name Name of the bulk operation
     * @param array $post_ids Array of post IDs involved
     * @param callable $callback Function to generate bulk data
     * @param int $ttl Cache time to live
     * @return mixed Bulk operation results
     */
    protected function fetchBulkWithCache(string $operation_name, array $post_ids, callable $callback, int $ttl = 300): mixed
    {
        // Create cache key based on operation and post IDs
        $cache_key = $this->buildBulkCacheKey($operation_name, $post_ids);

        return $this->fetchWithCache($cache_key, $callback, $ttl, [
            'type' => 'bulk_operation',
            'operation' => $operation_name,
            'post_count' => count($post_ids),
        ]);
    }

    /**
     * Cache individual post data with automatic invalidation tracking
     *
     * @param int $post_id Post ID
     * @param string $data_type Type of data being cached
     * @param callable $callback Function to generate data
     * @param int $ttl Cache time to live
     * @return mixed Cached post data
     */
    protected function fetchPostDataWithCache(int $post_id, string $data_type, callable $callback, int $ttl = 600): mixed
    {
        $cache_key = $this->buildPostCacheKey($post_id, $data_type);

        $data = $this->fetchWithCache($cache_key, $callback, $ttl, [
            'type' => 'post_data',
            'post_id' => $post_id,
            'data_type' => $data_type,
        ]);

        // Track for invalidation
        $this->trackPostCacheKey($post_id, $cache_key);

        return $data;
    }

    /**
     * Invalidate cache for specific posts
     *
     * @param array $post_ids Post IDs to invalidate cache for
     * @param array $data_types Specific data types to invalidate (empty = all)
     * @return int Number of cache entries invalidated
     */
    protected function invalidatePostCache(array $post_ids, array $data_types = []): int
    {
        $invalidated = 0;

        foreach ($post_ids as $post_id) {
            $keys_to_delete = $this->getPostCacheKeys($post_id, $data_types);

            foreach ($keys_to_delete as $key) {
                if ($this->deleteFromCache($key)) {
                    $invalidated++;
                }
            }

            // Also invalidate bulk operations that might include this post
            $invalidated += $this->invalidateBulkCacheContainingPost($post_id);
        }

        return $invalidated;
    }

    /**
     * Warm cache for frequently accessed data
     *
     * @param array $cache_specs Array of cache specifications
     * @return array Results of cache warming operations
     */
    protected function warmCache(array $cache_specs): array
    {
        $results = [];

        foreach ($cache_specs as $spec) {
            $cache_key = $spec['key'];
            $callback = $spec['callback'];
            $ttl = $spec['ttl'] ?? $this->cacheConfig['default_ttl'];

            try {
                $start_time = microtime(true);
                $data = $this->fetchWithCache($cache_key, $callback, $ttl);
                $duration = microtime(true) - $start_time;

                $results[$cache_key] = [
                    'success' => true,
                    'duration_ms' => round($duration * 1000, 2),
                    'data_size' => is_string($data) ? strlen($data) : strlen(serialize($data)),
                ];
            } catch (\Exception $e) {
                $results[$cache_key] = [
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * Get cache statistics
     *
     * @return array Cache performance statistics
     */
    protected function getCacheStats(): array
    {
        $total_requests = $this->cacheStats['hits'] + $this->cacheStats['misses'];
        $hit_rate = $total_requests > 0 ? ($this->cacheStats['hits'] / $total_requests) * 100 : 0;

        return array_merge($this->cacheStats, [
            'total_requests' => $total_requests,
            'hit_rate_percent' => round($hit_rate, 2),
            'cache_efficiency' => $this->calculateCacheEfficiency(),
        ]);
    }

    /**
     * Build a standardized cache key
     *
     * @param string $base_key Base cache key
     * @param array $options Additional options for key generation
     * @return string Full cache key
     */
    private function buildCacheKey(string $base_key, array $options = []): string
    {
        $prefix = $this->cacheConfig['key_prefix'];
        $key_parts = [$prefix, $base_key];

        // Add context-specific suffixes
        if (isset($options['user_id'])) {
            $key_parts[] = 'user_' . $options['user_id'];
        }

        if (isset($options['locale'])) {
            $key_parts[] = 'locale_' . $options['locale'];
        }

        // Add version suffix for cache invalidation
        $key_parts[] = 'v' . $this->getCacheVersion();

        return implode(':', $key_parts);
    }

    /**
     * Build cache key for bulk operations
     *
     * @param string $operation_name Name of the operation
     * @param array $post_ids Post IDs involved
     * @return string Bulk operation cache key
     */
    private function buildBulkCacheKey(string $operation_name, array $post_ids): string
    {
        // Sort post IDs to ensure consistent cache keys regardless of input order
        sort($post_ids, SORT_NUMERIC);

        // For large arrays, use a hash to keep key length manageable
        $ids_string = count($post_ids) > 20
            ? 'hash_' . md5(implode(',', $post_ids))
            : implode('_', $post_ids);

        return "bulk_{$operation_name}_{$ids_string}";
    }

    /**
     * Build cache key for individual post data
     *
     * @param int $post_id Post ID
     * @param string $data_type Type of data
     * @return string Post data cache key
     */
    private function buildPostCacheKey(int $post_id, string $data_type): string
    {
        return "post_{$post_id}_{$data_type}";
    }

    /**
     * Get data from cache using the configured cache backend
     *
     * @param string $key Cache key
     * @param array $options Caching options
     * @return mixed Cached data or false if not found
     */
    private function getFromCache(string $key, array $options = []): mixed
    {
        // Try object cache first if available
        if ($this->cacheConfig['use_object_cache'] && function_exists('wp_cache_get')) {
            $group = $options['cache_group'] ?? 'fanculo_api';
            $data = wp_cache_get($key, $group);
            if ($data !== false) {
                return $data;
            }
        }

        // Fall back to transients
        if ($this->cacheConfig['use_transients']) {
            return get_transient($key);
        }

        return false;
    }

    /**
     * Set data in cache using the configured cache backend
     *
     * @param string $key Cache key
     * @param mixed $data Data to cache
     * @param int $ttl Time to live
     * @param array $options Caching options
     * @return bool Success status
     */
    private function setCache(string $key, mixed $data, int $ttl, array $options = []): bool
    {
        $this->cacheStats['sets']++;

        $success = false;

        // Try object cache first if available
        if ($this->cacheConfig['use_object_cache'] && function_exists('wp_cache_set')) {
            $group = $options['cache_group'] ?? 'fanculo_api';
            $success = wp_cache_set($key, $data, $group, $ttl);
        }

        // Also set in transients for persistence
        if ($this->cacheConfig['use_transients']) {
            $success = set_transient($key, $data, $ttl) || $success;
        }

        return $success;
    }

    /**
     * Delete data from cache
     *
     * @param string $key Cache key
     * @return bool Success status
     */
    private function deleteFromCache(string $key): bool
    {
        $this->cacheStats['deletes']++;

        $success = false;

        // Delete from object cache
        if ($this->cacheConfig['use_object_cache'] && function_exists('wp_cache_delete')) {
            $success = wp_cache_delete($key, 'fanculo_api');
        }

        // Delete from transients
        if ($this->cacheConfig['use_transients']) {
            $success = delete_transient($key) || $success;
        }

        return $success;
    }

    /**
     * Track cache keys for a specific post (for invalidation)
     *
     * @param int $post_id Post ID
     * @param string $cache_key Cache key to track
     */
    private function trackPostCacheKey(int $post_id, string $cache_key): void
    {
        $tracking_key = "post_cache_keys_{$post_id}";
        $existing_keys = get_transient($tracking_key) ?: [];

        if (!in_array($cache_key, $existing_keys)) {
            $existing_keys[] = $cache_key;
            set_transient($tracking_key, $existing_keys, DAY_IN_SECONDS);
        }
    }

    /**
     * Get cache keys for a specific post
     *
     * @param int $post_id Post ID
     * @param array $data_types Specific data types (empty = all)
     * @return array Cache keys for the post
     */
    private function getPostCacheKeys(int $post_id, array $data_types = []): array
    {
        $tracking_key = "post_cache_keys_{$post_id}";
        $keys = get_transient($tracking_key) ?: [];

        // Filter by data types if specified
        if (!empty($data_types)) {
            $keys = array_filter($keys, function($key) use ($data_types) {
                foreach ($data_types as $type) {
                    if (strpos($key, "_{$type}") !== false) {
                        return true;
                    }
                }
                return false;
            });
        }

        return $keys;
    }

    /**
     * Invalidate bulk cache entries that might contain a specific post
     *
     * @param int $post_id Post ID
     * @return int Number of cache entries invalidated
     */
    private function invalidateBulkCacheContainingPost(int $post_id): int
    {
        // This is a simplified approach - in a full implementation,
        // you might track which bulk operations include which posts
        $bulk_cache_pattern = $this->cacheConfig['key_prefix'] . 'bulk_*';

        // For now, we'll invalidate common bulk operations
        $common_bulk_operations = [
            'posts_list',
            'scss_partials',
            'block_settings',
            'post_metadata',
        ];

        $invalidated = 0;
        foreach ($common_bulk_operations as $operation) {
            $pattern_key = "bulk_{$operation}_*";
            $invalidated += $this->invalidateCachePattern($pattern_key);
        }

        return $invalidated;
    }

    /**
     * Invalidate cache entries matching a pattern
     *
     * @param string $pattern Cache key pattern
     * @return int Number of entries invalidated
     */
    private function invalidateCachePattern(string $pattern): int
    {
        // This is a simplified implementation
        // In a production environment, you might use more sophisticated pattern matching
        return 0;
    }

    /**
     * Calculate cache efficiency score
     *
     * @return float Efficiency score (0-100)
     */
    private function calculateCacheEfficiency(): float
    {
        $total_requests = $this->cacheStats['hits'] + $this->cacheStats['misses'];

        if ($total_requests === 0) {
            return 0.0;
        }

        $hit_rate = ($this->cacheStats['hits'] / $total_requests) * 100;

        // Factor in the ratio of cache operations
        $operation_ratio = ($this->cacheStats['sets'] + $this->cacheStats['deletes']) / $total_requests;
        $efficiency_modifier = max(0.5, 1 - ($operation_ratio * 0.1)); // Reduce efficiency if too many cache writes

        return round($hit_rate * $efficiency_modifier, 2);
    }

    /**
     * Get current cache version for invalidation
     *
     * @return string Cache version
     */
    private function getCacheVersion(): string
    {
        // You might get this from a database setting or configuration
        return get_option('fanculo_cache_version', '1.0');
    }

    /**
     * Configure caching behavior
     *
     * @param array $config Configuration options
     */
    protected function configureCaching(array $config): void
    {
        $this->cacheConfig = array_merge($this->cacheConfig, $config);
    }

    /**
     * Clear all plugin-related cache
     *
     * @return bool Success status
     */
    protected function clearAllCache(): bool
    {
        // Increment cache version to invalidate all cached data
        $current_version = get_option('fanculo_cache_version', '1.0');
        $new_version = version_compare($current_version, '99.0', '<')
            ? $current_version + 0.1
            : '1.0';

        return update_option('fanculo_cache_version', (string)$new_version);
    }
}