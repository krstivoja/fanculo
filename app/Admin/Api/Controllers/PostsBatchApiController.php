<?php

namespace Fanculo\Admin\Api\Controllers;

use Fanculo\Content\FunculoPostType;
use Fanculo\Admin\Api\Services\MetaKeysConstants;

/**
 * Posts Batch API Controller - Batch Operations
 *
 * Handles batch operations including:
 * - Fetching multiple posts by IDs
 * - Batch updating multiple posts
 * - Bulk operations for performance
 */
class PostsBatchApiController extends BaseApiController
{
    public function registerRoutes()
    {
        // Batch fetch multiple posts by IDs
        register_rest_route('funculo/v1', '/posts/batch', [
            'methods' => 'POST',
            'callback' => [$this, 'getBatchPosts'],
            'permission_callback' => [$this, 'checkPermissions'],
            'args' => [
                'post_ids' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param);
                    }
                ],
                'include_meta' => [
                    'default' => true,
                    'sanitize_callback' => 'rest_sanitize_boolean',
                ]
            ]
        ]);

        // Batch update multiple posts
        register_rest_route('funculo/v1', '/posts/batch-update', [
            'methods' => 'PUT',
            'callback' => [$this, 'batchUpdatePosts'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'updates' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param);
                    }
                ]
            ]
        ]);
    }

    public function getBatchPosts($request)
    {
        $startTime = microtime(true);
        $postIds = $request->get_param('post_ids');
        $includeMeta = $request->get_param('include_meta');

        // Use the new BulkOperationTrait for validation and processing
        return $this->fetchBulkWithCache(
            'batch_posts_' . md5(serialize($postIds)) . '_' . ($includeMeta ? '1' : '0'),
            $postIds,
            function() use ($postIds, $includeMeta, $startTime) {
                // Execute bulk post processor from BulkOperationTrait
                $results = $this->executeBulkPostProcessor(
                    $postIds,
                    function($post, $pipelineResult, $index) use ($includeMeta) {
                        // Build response using standardized formatting
                        $formatOptions = [
                            'applyDatabaseSettingsFormatting' => $includeMeta,
                            'includeEditUrl' => true,
                            'includeDates' => true,
                        ];

                        return $this->standardBulkPipeline->formatPostData($post, $pipelineResult, $formatOptions);
                    },
                    [
                        'operation_name' => 'getBatchPosts',
                        'max_items' => 50,
                    ]
                );

                // Convert to expected format for response
                $posts = array_column($results['successful'], 'result');

                // Create performance metadata using the trait
                $performanceData = $this->createPerformanceMetadata('getBatchPosts', $startTime, count($posts));

                // Add additional metadata
                $performanceData['requested_count'] = count($postIds);
                $performanceData['found_count'] = count($posts);

                return $this->responseFormatter->collection($posts, ['performance' => $performanceData]);
            },
            300 // 5 minutes cache
        );
    }

    public function batchUpdatePosts($request)
    {
        $startTime = microtime(true);
        $updates = $request->get_param('updates');

        if (empty($updates) || !is_array($updates)) {
            return $this->responseFormatter->validationError(['updates' => 'Updates array is required']);
        }

        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($updates),
        ];

        // Process each update
        foreach ($updates as $index => $update) {
            if (!isset($update['post_id'])) {
                $results['failed'][] = [
                    'index' => $index,
                    'error' => 'Post ID is required',
                ];
                continue;
            }

            $postId = absint($update['post_id']);
            $post = get_post($postId);

            if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
                $results['failed'][] = [
                    'index' => $index,
                    'post_id' => $postId,
                    'error' => 'Post not found',
                ];
                continue;
            }

            try {
                // Update title if provided
                if (isset($update['title']) && !empty(trim($update['title']))) {
                    wp_update_post([
                        'ID' => $postId,
                        'post_title' => sanitize_text_field($update['title']),
                    ]);
                }

                // Update content if provided
                if (isset($update['content'])) {
                    wp_update_post([
                        'ID' => $postId,
                        'post_content' => wp_kses_post($update['content']),
                    ]);
                }

                // Update meta if provided
                if (isset($update['meta']) && is_array($update['meta'])) {
                    foreach ($update['meta'] as $metaKey => $metaValue) {
                        // Sanitize the meta key and value
                        $metaKey = sanitize_key($metaKey);
                        if (is_string($metaValue)) {
                            $metaValue = sanitize_textarea_field($metaValue);
                        }
                        update_post_meta($postId, $metaKey, $metaValue);
                    }
                }

                $results['successful'][] = [
                    'index' => $index,
                    'post_id' => $postId,
                    'updated' => true,
                ];

            } catch (\Exception $e) {
                $results['failed'][] = [
                    'index' => $index,
                    'post_id' => $postId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('batchUpdatePosts', $results['total'], $startTime);

        $performanceData = [
            'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
            'successful_count' => count($results['successful']),
            'failed_count' => count($results['failed']),
        ];

        return $this->responseFormatter->batch($results, $performanceData);
    }
}