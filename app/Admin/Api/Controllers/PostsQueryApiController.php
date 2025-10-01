<?php

namespace Fanculo\Admin\Api\Controllers;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Database\BlockSettingsRepository;
use Fanculo\Database\ScssPartialsSettingsRepository;
use Fanculo\Admin\Api\ScssCompilerApiController;
use Fanculo\Admin\Api\BlockCategoriesApiController;

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

        // Debug logging for selected_partials
        error_log("Fanculo Debug: PostsQueryApiController getPostWithRelated - Post ID: $postId, meta blocks: " . json_encode($postData['meta']['blocks'] ?? []));

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
                    // For SCSS partials, include global settings
                    $globalSetting = get_post_meta($post->ID, MetaKeysConstants::SCSS_IS_GLOBAL, true);
                    $globalOrder = get_post_meta($post->ID, MetaKeysConstants::SCSS_GLOBAL_ORDER, true);

                    $relatedData['global_settings'] = [
                        'is_global' => $globalSetting === '1',
                        'global_order' => $globalOrder ? (int)$globalOrder : 1,
                    ];
                    break;
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('getPostWithRelated', 1, $startTime);

        $performanceData = [
            'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
        ];

        // Final debug logging before sending response
        error_log("Fanculo Debug: PostsQueryApiController getPostWithRelated - Final response post.meta.blocks: " . json_encode($postData['meta']['blocks'] ?? []));

        return $this->responseFormatter->success([
            'post' => $postData,
            'related' => $relatedData,
        ], ['performance' => $performanceData]);
    }
}