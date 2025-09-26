<?php

namespace Fanculo\Admin\Api\Services;

use WP_REST_Response;
use WP_Error;

/**
 * Unified API Service for standardized batch operations and response handling
 *
 * This service provides a consistent interface for all API controllers,
 * eliminating code duplication and ensuring consistent patterns across endpoints.
 */
class UnifiedApiService
{
    /**
     * @var ApiResponseFormatter
     */
    private $responseFormatter;

    /**
     * @var BulkQueryService
     */
    private $bulkQueryService;

    /**
     * @var array Performance tracking data
     */
    private $performanceData = [];

    /**
     * @var int Default cache duration in seconds
     */
    const DEFAULT_CACHE_DURATION = 300; // 5 minutes

    public function __construct()
    {
        $this->responseFormatter = new ApiResponseFormatter();
        $this->bulkQueryService = new BulkQueryService();
    }

    /**
     * Execute batch operations with standardized error handling
     *
     * @param array $operations Array of operations to execute
     * @param callable $operationHandler Callback to handle each operation
     * @param array $options Optional settings (cache, timeout, etc.)
     * @return WP_REST_Response
     */
    public function executeBatchOperations(array $operations, callable $operationHandler, array $options = []): WP_REST_Response
    {
        $startTime = microtime(true);
        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($operations),
        ];

        // Apply default options
        $options = array_merge([
            'cache' => true,
            'cache_duration' => self::DEFAULT_CACHE_DURATION,
            'timeout' => 30,
            'max_operations' => 50,
        ], $options);

        // Validate operation count
        if (count($operations) > $options['max_operations']) {
            return $this->responseFormatter->error(
                'too_many_operations',
                sprintf('Maximum %d operations allowed per request', $options['max_operations']),
                400
            );
        }

        // Process operations
        foreach ($operations as $index => $operation) {
            try {
                // Set operation timeout if needed
                if ($options['timeout']) {
                    set_time_limit($options['timeout']);
                }

                // Execute the operation
                $result = call_user_func($operationHandler, $operation, $index);

                // Add to successful results
                $results['successful'][] = [
                    'index' => $index,
                    'operation' => $operation,
                    'result' => $result,
                ];

            } catch (\Exception $e) {
                // Add to failed results
                $results['failed'][] = [
                    'index' => $index,
                    'operation' => $operation,
                    'error' => $e->getMessage(),
                    'code' => $e->getCode() ?: 500,
                ];
            }
        }

        // Calculate performance metrics
        $duration = microtime(true) - $startTime;
        $this->performanceData = [
            'duration_ms' => round($duration * 1000, 2),
            'operations_total' => $results['total'],
            'operations_successful' => count($results['successful']),
            'operations_failed' => count($results['failed']),
        ];

        // Determine status code (207 for partial success)
        $statusCode = empty($results['failed']) ? 200 : 207;

        // Format and return response
        return $this->responseFormatter->batch($results, $this->performanceData, $statusCode);
    }

    /**
     * Fetch bulk data with caching support
     *
     * @param string $cacheKey Unique cache key
     * @param callable $dataFetcher Function to fetch data if not cached
     * @param int $cacheDuration Cache duration in seconds
     * @return mixed Cached or fresh data
     */
    public function fetchWithCache(string $cacheKey, callable $dataFetcher, int $cacheDuration = self::DEFAULT_CACHE_DURATION)
    {
        // Try to get from cache
        $cachedData = wp_cache_get($cacheKey, 'fanculo_api');

        if (false !== $cachedData) {
            $this->performanceData['cache_hit'] = true;
            return $cachedData;
        }

        // Fetch fresh data
        $this->performanceData['cache_hit'] = false;
        $data = call_user_func($dataFetcher);

        // Store in cache
        if ($data !== null) {
            wp_cache_set($cacheKey, $data, 'fanculo_api', $cacheDuration);
        }

        return $data;
    }

    /**
     * Bulk fetch with optimized queries
     *
     * @param array $ids Array of IDs to fetch
     * @param string $type Type of data (posts, meta, terms, etc.)
     * @param array $options Additional options
     * @return array
     */
    public function bulkFetch(array $ids, string $type, array $options = []): array
    {
        $startTime = microtime(true);

        // Generate cache key
        $cacheKey = 'fanculo_bulk_' . $type . '_' . md5(serialize($ids) . serialize($options));

        // Use cache if enabled
        if (!empty($options['cache'])) {
            $cached = $this->fetchWithCache($cacheKey, function() use ($ids, $type, $options) {
                return $this->performBulkFetch($ids, $type, $options);
            }, $options['cache_duration'] ?? self::DEFAULT_CACHE_DURATION);

            if ($cached !== null) {
                return $cached;
            }
        }

        // Perform fetch without cache
        $result = $this->performBulkFetch($ids, $type, $options);

        // Track performance
        $this->performanceData['fetch_duration_ms'] = round((microtime(true) - $startTime) * 1000, 2);

        return $result;
    }

    /**
     * Perform the actual bulk fetch operation
     *
     * @param array $ids IDs to fetch
     * @param string $type Type of data
     * @param array $options Options
     * @return array
     */
    private function performBulkFetch(array $ids, string $type, array $options): array
    {
        switch ($type) {
            case 'posts':
                return $this->bulkFetchPosts($ids, $options);

            case 'meta':
                return $this->bulkQueryService->getBulkPostMeta(
                    $ids,
                    $options['meta_keys'] ?? $this->bulkQueryService->getAllPossibleMetaKeys()
                );

            case 'terms':
                return $this->bulkQueryService->getBulkPostTerms(
                    $ids,
                    $options['taxonomy'] ?? ''
                );

            default:
                throw new \InvalidArgumentException("Unknown fetch type: {$type}");
        }
    }

    /**
     * Bulk fetch posts with optimization
     *
     * @param array $postIds Post IDs
     * @param array $options Options
     * @return array
     */
    private function bulkFetchPosts(array $postIds, array $options): array
    {
        global $wpdb;

        // Sanitize IDs
        $postIds = array_map('absint', $postIds);
        $postIds = array_filter($postIds);

        if (empty($postIds)) {
            return [];
        }

        // Build query
        $placeholders = implode(',', array_fill(0, count($postIds), '%d'));

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from $wpdb->posts is safe
        $sql = $wpdb->prepare(
            "SELECT * FROM {$wpdb->posts}
            WHERE ID IN ({$placeholders})
            AND post_type = %s",
            array_merge($postIds, [$options['post_type'] ?? 'funculo'])
        );

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Optimized bulk query
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Query is already prepared above
        $posts = $wpdb->get_results($sql);

        // Convert to associative array by ID
        $result = [];
        foreach ($posts as $post) {
            $result[$post->ID] = $post;
        }

        return $result;
    }

    /**
     * Validate batch operation structure
     *
     * @param array $operation Operation to validate
     * @return bool
     * @throws \InvalidArgumentException
     */
    public function validateOperation(array $operation): bool
    {
        if (!isset($operation['type'])) {
            throw new \InvalidArgumentException('Operation must have a type');
        }

        if (!isset($operation['data'])) {
            throw new \InvalidArgumentException('Operation must have data');
        }

        if (!is_array($operation['data'])) {
            throw new \InvalidArgumentException('Operation data must be an array');
        }

        return true;
    }

    /**
     * Clear API cache
     *
     * @param string|null $pattern Optional pattern to match cache keys
     */
    public function clearCache(?string $pattern = null): void
    {
        if ($pattern) {
            // Clear specific pattern
            wp_cache_delete($pattern, 'fanculo_api');
        } else {
            // Clear all API cache
            wp_cache_flush_group('fanculo_api');
        }
    }

    /**
     * Get performance data for the last operation
     *
     * @return array
     */
    public function getPerformanceData(): array
    {
        return $this->performanceData;
    }

    /**
     * Process operations in chunks to avoid memory issues
     *
     * @param array $items Items to process
     * @param int $chunkSize Size of each chunk
     * @param callable $processor Function to process each chunk
     * @return array Combined results
     */
    public function processInChunks(array $items, int $chunkSize, callable $processor): array
    {
        $results = [];
        $chunks = array_chunk($items, $chunkSize);

        foreach ($chunks as $index => $chunk) {
            $chunkResult = call_user_func($processor, $chunk, $index);
            if (is_array($chunkResult)) {
                $results = array_merge($results, $chunkResult);
            }
        }

        return $results;
    }

    /**
     * Create standardized error response
     *
     * @param string $code Error code
     * @param string $message Error message
     * @param int $status HTTP status code
     * @return WP_Error
     */
    public function createError(string $code, string $message, int $status = 500): WP_Error
    {
        return new WP_Error($code, $message, ['status' => $status]);
    }

    /**
     * Create standardized success response
     *
     * @param mixed $data Response data
     * @param array $meta Optional metadata
     * @param int $status HTTP status code
     * @return WP_REST_Response
     */
    public function createSuccessResponse($data, array $meta = [], int $status = 200): WP_REST_Response
    {
        return $this->responseFormatter->success($data, array_merge($meta, $this->performanceData), $status);
    }
}