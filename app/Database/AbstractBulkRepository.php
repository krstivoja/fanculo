<?php

namespace FanCoolo\Database;

/**
 * Abstract Bulk Repository
 *
 * Provides common functionality and error handling patterns for all
 * repository implementations. Enforces the BulkRepositoryInterface
 * while providing shared utilities.
 */
abstract class AbstractBulkRepository implements BulkRepositoryInterface
{
    /**
     * Validate an array of post IDs
     *
     * @param array $post_ids Array of post IDs to validate
     * @return array Validated and sanitized post IDs
     * @throws \InvalidArgumentException When validation fails
     */
    protected static function validatePostIds(array $post_ids): array
    {
        if (empty($post_ids)) {
            return [];
        }

        // Filter out non-numeric and non-positive values
        $validated_ids = array_filter($post_ids, function($id) {
            return is_numeric($id) && (int)$id > 0;
        });

        // Convert to integers
        $validated_ids = array_map('intval', $validated_ids);

        // Remove duplicates
        $validated_ids = array_unique($validated_ids);

        if (empty($validated_ids)) {
            throw new \InvalidArgumentException('No valid post IDs provided');
        }

        return $validated_ids;
    }

    /**
     * Validate a single post ID
     *
     * @param int $post_id Post ID to validate
     * @return int Validated post ID
     * @throws \InvalidArgumentException When validation fails
     */
    protected static function validatePostId(int $post_id): int
    {
        if ($post_id <= 0) {
            throw new \InvalidArgumentException('Post ID must be a positive integer');
        }

        return $post_id;
    }

    /**
     * Handle database errors in a consistent way
     *
     * @param string $operation The operation that failed (for logging)
     * @param string $error_message The database error message
     * @throws \RuntimeException Always throws with formatted error message
     */
    protected static function handleDatabaseError(string $operation, string $error_message): void
    {
        $message = sprintf('Database operation failed: %s. Error: %s', $operation, $error_message);
        error_log("FanCoolo Repository Error: {$message}");
        throw new \RuntimeException($message);
    }

    /**
     * Create SQL placeholders for bulk queries
     *
     * @param array $post_ids Array of post IDs
     * @return string SQL placeholder string (e.g., "%d,%d,%d")
     */
    protected static function createPlaceholders(array $post_ids): string
    {
        return implode(',', array_fill(0, count($post_ids), '%d'));
    }

    /**
     * Get the WordPress database instance with error checking
     *
     * @return \wpdb WordPress database instance
     * @throws \RuntimeException When database is not available
     */
    protected static function getDatabase(): \wpdb
    {
        global $wpdb;

        if (!$wpdb instanceof \wpdb) {
            throw new \RuntimeException('WordPress database instance not available');
        }

        return $wpdb;
    }

    /**
     * Execute a prepared query with error handling
     *
     * @param string $query The SQL query
     * @param array $params Parameters for the query
     * @param string $operation Description of the operation for error logging
     * @return mixed Query results
     * @throws \RuntimeException When query fails
     */
    protected static function executeQuery(string $query, array $params, string $operation)
    {
        $wpdb = self::getDatabase();

        if (!empty($params)) {
            $prepared_query = $wpdb->prepare($query, ...$params);
        } else {
            $prepared_query = $query;
        }

        $result = $wpdb->get_results($prepared_query, ARRAY_A);

        if ($wpdb->last_error) {
            self::handleDatabaseError($operation, $wpdb->last_error);
        }

        return $result;
    }

    /**
     * Execute a single row query with error handling
     *
     * @param string $query The SQL query
     * @param array $params Parameters for the query
     * @param string $operation Description of the operation for error logging
     * @return array|null Single row result or null
     * @throws \RuntimeException When query fails
     */
    protected static function executeRowQuery(string $query, array $params, string $operation): ?array
    {
        $wpdb = self::getDatabase();

        $prepared_query = $wpdb->prepare($query, ...$params);
        $result = $wpdb->get_row($prepared_query, ARRAY_A);

        if ($wpdb->last_error) {
            self::handleDatabaseError($operation, $wpdb->last_error);
        }

        return $result;
    }

    /**
     * Execute an insert/update/delete query with error handling
     *
     * @param string $query The SQL query
     * @param array $params Parameters for the query
     * @param string $operation Description of the operation for error logging
     * @return bool True on success
     * @throws \RuntimeException When query fails
     */
    protected static function executeWriteQuery(string $query, array $params, string $operation): bool
    {
        $wpdb = self::getDatabase();

        $prepared_query = $wpdb->prepare($query, ...$params);
        $result = $wpdb->query($prepared_query);

        if ($wpdb->last_error) {
            self::handleDatabaseError($operation, $wpdb->last_error);
        }

        return $result !== false;
    }
}