<?php

namespace FanCoolo\Admin\Api;

use FanCoolo\FilesManager\FilesManagerService;
use FanCoolo\Admin\Api\Controllers\BaseApiController;
use FanCoolo\Content\FunculoPostType;

class FileGenerationApiController extends BaseApiController
{

    public function registerRoutes()
    {
        // File generation routes
        register_rest_route('funculo/v1', '/regenerate-files', [
            'methods' => 'POST',
            'callback' => [$this, 'regenerateFiles'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
        ]);

        // Force regenerate all files (manual button)
        register_rest_route('funculo/v1', '/force-regenerate-all', [
            'methods' => 'POST',
            'callback' => [$this, 'forceRegenerateAll'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
        ]);

        // Batch file generation for specific posts
        register_rest_route('funculo/v1', '/files/generate-batch', [
            'methods' => 'POST',
            'callback' => [$this, 'batchGenerateFiles'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'post_ids' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 20;
                    }
                ],
                'regenerate' => [
                    'default' => true,
                    'type' => 'boolean',
                    'description' => 'Whether to regenerate existing files',
                ],
            ],
        ]);

        // Check file generation status
        register_rest_route('funculo/v1', '/files/status', [
            'methods' => 'POST',
            'callback' => [$this, 'checkFilesStatus'],
            'permission_callback' => [$this, 'checkPermissions'],
            'args' => [
                'post_ids' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 50;
                    }
                ],
            ],
        ]);
    }


    public function regenerateFiles($request)
    {
        try {
            $startTime = microtime(true);
            $filesManagerService = new FilesManagerService();
            $filesManagerService->regenerateAllFiles();

            $performanceData = [
                'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
            ];

            return $this->responseFormatter->success(
                null,
                array_merge(['message' => 'All files have been regenerated successfully'], $performanceData)
            );
        } catch (\Exception $e) {
            return $this->responseFormatter->serverError('Failed to regenerate files', $e);
        }
    }

    /**
     * Force regenerate all files (used by manual "Regenerate All" button)
     */
    public function forceRegenerateAll($request)
    {
        try {
            $startTime = microtime(true);
            $filesManagerService = new FilesManagerService();
            $filesManagerService->regenerateAllFiles();

            $performanceData = [
                'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
            ];

            return $this->responseFormatter->success(
                null,
                array_merge(['message' => 'All files have been forcefully regenerated successfully'], $performanceData)
            );
        } catch (\Exception $e) {
            return $this->responseFormatter->serverError('Failed to force regenerate files', $e);
        }
    }

    /**
     * Batch generate files for specific posts
     */
    public function batchGenerateFiles($request)
    {
        $startTime = microtime(true);
        $postIds = $request->get_param('post_ids');
        $regenerate = $request->get_param('regenerate');

        // Validate post IDs
        $postIds = array_map('absint', array_filter($postIds));
        if (empty($postIds)) {
            return $this->responseFormatter->validationError(['post_ids' => 'At least one valid post ID is required']);
        }

        // Get posts using WP_Query (Step 1)
        $args = [
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'post__in' => $postIds,
            'posts_per_page' => count($postIds),
        ];

        $query = new \WP_Query($args);

        if (empty($query->posts)) {
            return $this->responseFormatter->collection([], [
                'message' => 'No valid posts found',
                'requested_count' => count($postIds),
            ]);
        }

        // Execute standardized bulk pipeline to get post data efficiently
        $pipelineResult = $this->standardBulkPipeline->executeBulkPipeline(wp_list_pluck($query->posts, 'ID'));

        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($query->posts),
        ];

        // Generate files for each post
        $filesManagerService = new FilesManagerService();
        foreach ($query->posts as $index => $post) {
            try {
                // Generate files for this post
                $filesManagerService->generateFilesOnPostSave($post->ID, $post, $regenerate);

                $results['successful'][] = [
                    'index' => $index,
                    'post_id' => $post->ID,
                    'title' => get_the_title($post->ID),
                    'regenerated' => $regenerate,
                ];

            } catch (\Exception $e) {
                $results['failed'][] = [
                    'index' => $index,
                    'post_id' => $post->ID,
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('batchGenerateFiles', $results['total'], $startTime);

        $performanceData = [
            'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
            'successful_count' => count($results['successful']),
            'failed_count' => count($results['failed']),
        ];

        return $this->responseFormatter->batch($results, $performanceData);
    }

    /**
     * Check file generation status for multiple posts
     */
    public function checkFilesStatus($request)
    {
        $startTime = microtime(true);
        $postIds = $request->get_param('post_ids');

        // Validate post IDs
        $postIds = array_map('absint', array_filter($postIds));
        if (empty($postIds)) {
            return $this->responseFormatter->validationError(['post_ids' => 'At least one valid post ID is required']);
        }

        // Get posts using WP_Query (Step 1)
        $args = [
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'post__in' => $postIds,
            'posts_per_page' => count($postIds),
        ];

        $query = new \WP_Query($args);

        if (empty($query->posts)) {
            return $this->responseFormatter->collection([], [
                'message' => 'No valid posts found',
                'requested_count' => count($postIds),
            ]);
        }

        // Execute standardized bulk pipeline to get post data efficiently
        $pipelineResult = $this->standardBulkPipeline->executeBulkPipeline(wp_list_pluck($query->posts, 'ID'));

        // Build file status response
        $formatOptions = [
            'applyDatabaseSettingsFormatting' => false,
            'includeEditUrl' => false,
            'includeDates' => true,
        ];

        $statusList = [];
        foreach ($query->posts as $post) {
            $postData = $this->standardBulkPipeline->formatPostData($post, $pipelineResult, $formatOptions);

            $statusList[] = [
                'post_id' => $post->ID,
                'title' => $post->post_title,
                'status' => $post->post_status,
                'type' => $postData['terms'][0]['slug'] ?? 'unknown',
                'last_modified' => $post->post_modified,
                'files_exist' => true, // TODO: Implement actual file existence check
            ];
        }

        // Log performance
        $this->bulkQueryService->logPerformance('checkFilesStatus', count($statusList), $startTime);

        $performanceData = [
            'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
            'requested_count' => count($postIds),
            'found_count' => count($statusList),
        ];

        return $this->responseFormatter->collection($statusList, ['performance' => $performanceData]);
    }
}