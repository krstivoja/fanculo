<?php

namespace FanCoolo\Admin\Api\Controllers;

use FanCoolo\Content\FunculoPostType;
use FanCoolo\Content\FunculoTypeTaxonomy;
use FanCoolo\Admin\Api\Services\MetaKeysConstants;
use FanCoolo\Database\BlockSettingsRepository;
use FanCoolo\Database\ScssPartialsSettingsRepository;
use FanCoolo\Database\PartialsUsageRepository;
use FanCoolo\Admin\Api\ScssCompilerApiController;
use FanCoolo\Admin\Api\BlockCategoriesApiController;

/**
 * Posts Query API Controller - Advanced Queries
 *
 * Handles complex queries including:
 * - Posts with related data
 * - Advanced search with metadata
 * - Complex filtering operations
 */
class PostsQueryApiController extends BaseApiController
{
    public function registerRoutes()
    {
        // Get post with all related data
        register_rest_route('funculo/v1', '/post/(?P<id>\d+)/with-related', [
            'methods' => 'GET',
            'callback' => [$this, 'getPostWithRelated'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);

        // Get partial usage info (which blocks use this partial)
        register_rest_route('funculo/v1', '/partial/(?P<id>\d+)/usage', [
            'methods' => 'GET',
            'callback' => [$this, 'getPartialUsage'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);
    }

    public function getPostWithRelated($request)
    {
        $startTime = microtime(true);
        $postId = $request->get_param('id');
        $post = get_post($postId);

        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return $this->responseFormatter->notFound('Post', $postId);
        }

        // Execute standardized bulk pipeline for single post
        $pipelineResult = $this->standardBulkPipeline->executeSinglePostPipeline($post->ID);

        // Format post data with standardized formatting
        $formatOptions = [
            'applyDatabaseSettingsFormatting' => true,
            'includeEditUrl' => true,
            'includeDates' => true,
        ];

        $postData = $this->standardBulkPipeline->formatPostData($post, $pipelineResult, $formatOptions);

        // Add content field (specific to this endpoint)
        $postData['content'] = $post->post_content;

        // Add recompile flag (private meta not returned by default)
        $needsRecompile = get_post_meta($post->ID, '_funculo_scss_needs_recompile', true);
        if ($needsRecompile) {
            $postData['meta']['_funculo_scss_needs_recompile'] = $needsRecompile;
            error_log("🔔 [PostsQueryApiController] Added recompile flag to response for post $postId: $needsRecompile");
        }

        // Debug logging for selected_partials
        error_log("FanCoolo Debug: PostsQueryApiController getPostWithRelated - Post ID: $postId, meta blocks: " . json_encode($postData['meta']['blocks'] ?? []));

        // Add related data based on post type
        $relatedData = [];
        $postTerms = $postData['terms'] ?? [];

        foreach ($postTerms as $term) {
            switch ($term['slug']) {
                case FunculoTypeTaxonomy::getTermBlocks():
                    // Get SCSS partials for blocks
                    $scssController = new ScssCompilerApiController();
                    $partialsRequest = new \WP_REST_Request('GET', '/funculo/v1/scss-partials');
                    $partialsResponse = $scssController->getScssPartials($partialsRequest);

                    if (!is_wp_error($partialsResponse)) {
                        $relatedData['scss_partials'] = $partialsResponse->get_data();
                    }

                    // Get block categories
                    $categoriesController = new BlockCategoriesApiController();
                    $categoriesRequest = new \WP_REST_Request('GET', '/funculo/v1/block-categories');
                    $categoriesResponse = $categoriesController->getBlockCategories($categoriesRequest);

                    if (!is_wp_error($categoriesResponse)) {
                        $relatedData['block_categories'] = $categoriesResponse->get_data();
                    }
                    break;

                case FunculoTypeTaxonomy::getTermScssPartials():
                    // For SCSS partials, include global settings from database table
                    $scssSettings = ScssPartialsSettingsRepository::get($post->ID);

                    if ($scssSettings) {
                        $relatedData['global_settings'] = [
                            'is_global' => $scssSettings['is_global'],
                            'global_order' => $scssSettings['global_order'],
                        ];
                    } else {
                        // Default values if no settings found
                        $relatedData['global_settings'] = [
                            'is_global' => false,
                            'global_order' => 1,
                        ];
                    }
                    break;
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('getPostWithRelated', 1, $startTime);

        $performanceData = [
            'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
        ];

        // Final debug logging before sending response
        error_log("FanCoolo Debug: PostsQueryApiController getPostWithRelated - Final response post.meta.blocks: " . json_encode($postData['meta']['blocks'] ?? []));

        return $this->responseFormatter->success([
            'post' => $postData,
            'related' => $relatedData,
        ], ['performance' => $performanceData]);
    }

    /**
     * Get partial usage information
     *
     * Shows which blocks are using this SCSS partial
     * Useful for understanding dependencies before deleting a partial
     *
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function getPartialUsage($request)
    {
        $partialId = $request->get_param('id');
        $partial = get_post($partialId);

        if (!$partial || $partial->post_type !== FunculoPostType::getPostType()) {
            return $this->responseFormatter->notFound('Partial', $partialId);
        }

        // Fast lookup using indexed junction table
        $frontendBlocks = PartialsUsageRepository::getBlocksUsingPartial($partialId, 'style');
        $editorBlocks = PartialsUsageRepository::getBlocksUsingPartial($partialId, 'editorStyle');
        $allBlocks = PartialsUsageRepository::getBlocksUsingPartial($partialId);

        // Get usage stats
        $stats = PartialsUsageRepository::getPartialUsageStats($partialId);

        // Get full block data for frontend blocks
        $frontendBlocksData = [];
        if (!empty($frontendBlocks)) {
            $posts = get_posts([
                'post_type' => FunculoPostType::getPostType(),
                'post__in' => $frontendBlocks,
                'numberposts' => -1,
                'orderby' => 'title',
                'order' => 'ASC'
            ]);

            foreach ($posts as $post) {
                $frontendBlocksData[] = [
                    'id' => $post->ID,
                    'title' => $post->post_title,
                    'slug' => $post->post_name
                ];
            }
        }

        // Get full block data for editor blocks
        $editorBlocksData = [];
        if (!empty($editorBlocks)) {
            $posts = get_posts([
                'post_type' => FunculoPostType::getPostType(),
                'post__in' => $editorBlocks,
                'numberposts' => -1,
                'orderby' => 'title',
                'order' => 'ASC'
            ]);

            foreach ($posts as $post) {
                $editorBlocksData[] = [
                    'id' => $post->ID,
                    'title' => $post->post_title,
                    'slug' => $post->post_name
                ];
            }
        }

        return $this->responseFormatter->success([
            'partial' => [
                'id' => $partial->ID,
                'title' => $partial->post_title,
                'slug' => $partial->post_name
            ],
            'usage' => [
                'frontend_blocks' => $frontendBlocksData,
                'editor_blocks' => $editorBlocksData,
                'stats' => $stats
            ]
        ]);
    }
}