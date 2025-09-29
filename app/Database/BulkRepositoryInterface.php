<?php

namespace Fanculo\Database;

/**
 * Bulk Repository Interface
 *
 * Standardizes bulk operations across all repository classes to ensure:
 * - Consistent method signatures
 * - Uniform return formats
 * - Common error handling patterns
 * - Performance optimization through bulk queries
 */
interface BulkRepositoryInterface
{
    /**
     * Retrieve records for multiple post IDs in a single query
     *
     * This method must be implemented by all repositories to provide
     * efficient bulk data retrieval, eliminating N+1 query problems.
     *
     * @param array $post_ids Array of post IDs to retrieve data for
     * @return array Associative array with post_id as key and data array as value
     *               Format: [post_id => data_array, ...]
     *               Returns empty array if no data found or on error
     *
     * @throws \InvalidArgumentException When post_ids is not an array or contains invalid IDs
     * @throws \RuntimeException When database operation fails
     */
    public static function getBulk(array $post_ids): array;

    /**
     * Get a single record by post ID
     *
     * @param int $post_id The post ID to retrieve data for
     * @return array|null Data array if found, null if not found
     *
     * @throws \InvalidArgumentException When post_id is not a positive integer
     * @throws \RuntimeException When database operation fails
     */
    public static function get(int $post_id): ?array;

    /**
     * Save or update a record for a specific post ID
     *
     * @param int $post_id The post ID to save data for
     * @param array $data Data to save
     * @return bool True on success, false on failure
     *
     * @throws \InvalidArgumentException When post_id or data is invalid
     * @throws \RuntimeException When database operation fails
     */
    public static function save(int $post_id, array $data): bool;

    /**
     * Delete a record by post ID
     *
     * @param int $post_id The post ID to delete data for
     * @return bool True on success, false on failure
     *
     * @throws \InvalidArgumentException When post_id is not a positive integer
     * @throws \RuntimeException When database operation fails
     */
    public static function delete(int $post_id): bool;
}