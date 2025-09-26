<?php

namespace Fanculo\Admin\Api;

use Fanculo\FilesManager\FilesManagerService;
use Fanculo\Admin\Api\Services\UnifiedApiService;
use Fanculo\Admin\Api\Services\ApiResponseFormatter;
use Fanculo\Admin\Api\Services\BulkQueryService;
use Fanculo\Content\FunculoPostType;

class FileGenerationApiController
{
    private $unifiedApiService;
    private $responseFormatter;
    private $bulkQueryService;

    public function __construct()
    {
        $this->unifiedApiService = new UnifiedApiService();
        $this->responseFormatter = new ApiResponseFormatter();
        $this->bulkQueryService = new BulkQueryService();
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

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

    public function checkPermissions()
    {
        return current_user_can('edit_posts');
    }

    public function checkCreatePermissions()
    {
        return current_user_can('publish_posts');
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
        $postIds = $request->get_param('post_ids');
        $regenerate = $request->get_param('regenerate');

        // Use unified service for batch operations
        return $this->unifiedApiService->executeBatchOperations(
            $postIds,
            function($postId, $index) use ($regenerate) {
                // Validate post ID
                if (!is_numeric($postId)) {
                    throw new \Exception('Invalid post ID');
                }

                $postId = (int)$postId;
                $post = get_post($postId);

                if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
                    throw new \Exception('Post not found or invalid type');
                }

                // Generate files for this post
                $filesManagerService = new FilesManagerService();
                $filesManagerService->generateFilesOnPostSave($postId, $post, $regenerate);

                return [
                    'post_id' => $postId,
                    'title' => get_the_title($postId),
                    'regenerated' => $regenerate,
                ];
            },
            ['max_operations' => 20, 'timeout' => 60]
        );
    }

    /**
     * Check file generation status for multiple posts
     */
    public function checkFilesStatus($request)
    {
        $postIds = $request->get_param('post_ids');

        // Use unified service with caching
        $cacheKey = 'fanculo_files_status_' . md5(serialize($postIds));

        $status = $this->unifiedApiService->fetchWithCache(
            $cacheKey,
            function() use ($postIds) {
                $statuses = [];
                $filesManagerService = new FilesManagerService();

                foreach ($postIds as $postId) {
                    if (!is_numeric($postId)) {
                        $statuses[$postId] = ['error' => 'Invalid post ID'];
                        continue;
                    }

                    $postId = (int)$postId;
                    $post = get_post($postId);

                    if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
                        $statuses[$postId] = ['error' => 'Post not found'];
                        continue;
                    }

                    // Check if files exist (you'll need to implement this method in FilesManagerService)
                    // For now, we'll just return basic info
                    $statuses[$postId] = [
                        'exists' => true,
                        'title' => get_the_title($postId),
                        'last_modified' => $post->post_modified,
                    ];
                }

                return $statuses;
            },
            60 // 1 minute cache for status checks
        );

        return $this->responseFormatter->success($status);
    }
}