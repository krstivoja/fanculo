<?php

namespace FanCoolo\Admin\Api\Traits;

use FanCoolo\Content\FunculoPostType;
use FanCoolo\Content\FunculoTypeTaxonomy;

/**
 * Bulk Operation Trait
 *
 * Provides common bulk operation workflows for API controllers.
 * Standardizes the most frequent bulk operation patterns to ensure
 * consistency and reduce code duplication.
 */
trait BulkOperationTrait
{
    /**
     * Execute a standard bulk post query with validation
     *
     * @param array $post_ids Array of post IDs to query
     * @param array $query_args Additional WP_Query arguments
     * @return \WP_Query|null Query object or null if no valid posts found
     */
    protected function executeBulkPostQuery(array $post_ids, array $query_args = []): ?\WP_Query
    {
        // Validate and sanitize post IDs
        $post_ids = $this->validatePostIds($post_ids);

        if (empty($post_ids)) {
            return null;
        }

        // Build standard query arguments
        $default_args = [
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'post__in' => $post_ids,
            'posts_per_page' => count($post_ids),
            'orderby' => 'post__in', // Maintain order of provided IDs
        ];

        // Merge with provided arguments
        $args = array_merge($default_args, $query_args);

        return new \WP_Query($args);
    }

    /**
     * Validate and sanitize an array of post IDs
     *
     * @param array $post_ids Raw post IDs
     * @return array Validated and sanitized post IDs
     */
    protected function validatePostIds(array $post_ids): array
    {
        if (empty($post_ids)) {
            return [];
        }

        // Convert to integers and filter out invalid values
        $validated_ids = array_filter(array_map('absint', $post_ids), function($id) {
            return $id > 0;
        });

        // Remove duplicates and re-index
        return array_values(array_unique($validated_ids));
    }

    /**
     * Execute bulk operations with consistent error handling and result formatting
     *
     * @param array $items Array of items to process
     * @param callable $processor Function to process each item (item, index) => result
     * @param array $options Processing options
     * @return array Standardized bulk results array
     */
    protected function executeBulkProcessor(array $items, callable $processor, array $options = []): array
    {
        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($items),
        ];

        $max_items = $options['max_items'] ?? 50;
        if (count($items) > $max_items) {
            $results['failed'][] = [
                'error' => "Maximum {$max_items} items allowed per bulk operation",
                'items_provided' => count($items),
            ];
            return $results;
        }

        foreach ($items as $index => $item) {
            try {
                $result = $processor($item, $index);
                $results['successful'][] = [
                    'index' => $index,
                    'result' => $result,
                ];
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'index' => $index,
                    'item' => $this->sanitizeItemForError($item),
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * Create a standardized bulk response with metadata
     *
     * @param array $results Results from executeBulkProcessor
     * @param array $metadata Additional metadata to include
     * @return array Standardized response array
     */
    protected function createBulkResponse(array $results, array $metadata = []): array
    {
        $response = [
            'data' => $results,
            'meta' => array_merge([
                'total_items' => $results['total'],
                'successful_count' => count($results['successful']),
                'failed_count' => count($results['failed']),
                'success_rate' => $results['total'] > 0
                    ? round((count($results['successful']) / $results['total']) * 100, 2)
                    : 0,
            ], $metadata)
        ];

        return $response;
    }

    /**
     * Execute bulk operations on posts with the standardized pipeline
     *
     * @param array $post_ids Array of post IDs to process
     * @param callable $processor Function to process each post (post, pipeline_result, index) => result
     * @param array $options Processing options
     * @return array Standardized bulk results
     */
    protected function executeBulkPostProcessor(array $post_ids, callable $processor, array $options = []): array
    {
        $startTime = microtime(true);

        // Execute bulk post query
        $query = $this->executeBulkPostQuery($post_ids, $options['query_args'] ?? []);

        if (!$query || empty($query->posts)) {
            return [
                'successful' => [],
                'failed' => [['error' => 'No valid posts found', 'requested_count' => count($post_ids)]],
                'total' => count($post_ids),
            ];
        }

        // Execute standardized bulk pipeline if available
        $pipelineResult = null;
        if (isset($this->standardBulkPipeline)) {
            $pipelineOptions = $options['pipeline_options'] ?? [];
            $pipelineResult = $this->standardBulkPipeline->executeBulkPipeline(
                wp_list_pluck($query->posts, 'ID'),
                $pipelineOptions
            );
        }

        // Process each post
        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($query->posts),
        ];

        foreach ($query->posts as $index => $post) {
            try {
                $result = $processor($post, $pipelineResult, $index);
                $results['successful'][] = [
                    'index' => $index,
                    'post_id' => $post->ID,
                    'result' => $result,
                ];
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'index' => $index,
                    'post_id' => $post->ID,
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Log performance if bulk query service is available
        if (isset($this->bulkQueryService)) {
            $operation = $options['operation_name'] ?? 'bulk_post_operation';
            $this->bulkQueryService->logPerformance($operation, $results['total'], $startTime);
        }

        return $results;
    }

    /**
     * Build taxonomy query arguments for bulk operations
     *
     * @param string|array $taxonomy_terms Term slug(s) to filter by
     * @param string $taxonomy_name Taxonomy name (defaults to Funculo taxonomy)
     * @return array Tax query arguments
     */
    protected function buildTaxonomyQuery($taxonomy_terms, ?string $taxonomy_name = null): array
    {
        if (empty($taxonomy_terms)) {
            return [];
        }

        $taxonomy_name = $taxonomy_name ?? FunculoTypeTaxonomy::getTaxonomy();

        if (!is_array($taxonomy_terms)) {
            $taxonomy_terms = [$taxonomy_terms];
        }

        return [
            'tax_query' => [
                [
                    'taxonomy' => $taxonomy_name,
                    'field' => 'slug',
                    'terms' => $taxonomy_terms,
                ]
            ]
        ];
    }

    /**
     * Sanitize item data for error reporting
     *
     * @param mixed $item Item data to sanitize
     * @return mixed Sanitized item data
     */
    private function sanitizeItemForError($item): mixed
    {
        // If it's an array, only include safe fields
        if (is_array($item)) {
            $safe_fields = ['id', 'post_id', 'title', 'type', 'status'];
            $sanitized = [];
            foreach ($safe_fields as $field) {
                if (isset($item[$field])) {
                    $sanitized[$field] = $item[$field];
                }
            }
            return $sanitized;
        }

        // If it's a scalar value, return as-is (it should be safe)
        if (is_scalar($item)) {
            return $item;
        }

        // For other types, just return the type
        return gettype($item);
    }

    /**
     * Extract post IDs from various input formats
     *
     * @param mixed $input Input that may contain post IDs
     * @return array Array of post IDs
     */
    protected function extractPostIds($input): array
    {
        if (is_numeric($input)) {
            return [absint($input)];
        }

        if (is_array($input)) {
            // If it's an array of objects with ID property
            if (isset($input[0]) && is_object($input[0]) && isset($input[0]->ID)) {
                return wp_list_pluck($input, 'ID');
            }

            // If it's an array of arrays with 'id' or 'post_id' key
            if (isset($input[0]) && is_array($input[0])) {
                if (isset($input[0]['id'])) {
                    return wp_list_pluck($input, 'id');
                }
                if (isset($input[0]['post_id'])) {
                    return wp_list_pluck($input, 'post_id');
                }
            }

            // Assume it's already an array of IDs
            return array_map('absint', $input);
        }

        return [];
    }
}