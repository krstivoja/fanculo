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

        // Get post data with bulk operations
        $allTerms = $this->bulkQueryService->getBulkPostTerms([$post->ID], FunculoTypeTaxonomy::getTaxonomy());
        $postTerms = $allTerms[$post->ID] ?? [];

        $optimizedMetaKeys = $this->bulkQueryService->getOptimizedMetaKeys($allTerms);
        $allMeta = $this->bulkQueryService->getBulkPostMeta([$post->ID], $optimizedMetaKeys);
        $postMeta = $allMeta[$post->ID] ?? [];

        // Format the meta data
        $formattedMeta = $this->bulkQueryService->formatPostMeta($postMeta, $postTerms);

        // Load block settings from database if this is a block
        $isBlock = false;
        $isScssPartial = false;
        foreach ($postTerms as $term) {
            if ($term['slug'] === 'blocks') {
                $isBlock = true;
            } elseif ($term['slug'] === 'scss-partials') {
                $isScssPartial = true;
            }
        }

        if ($isBlock) {
            $dbSettings = BlockSettingsRepository::get($post->ID);
            if ($dbSettings) {
                // Format settings for frontend compatibility
                $blockSettings = [
                    'category' => $dbSettings['category'],
                    'description' => $dbSettings['description'],
                    'icon' => $dbSettings['icon']
                ];

                // Format inner blocks settings
                $innerBlocksSettings = [
                    'enabled' => $dbSettings['supports_inner_blocks'],
                    'allowed_blocks' => $dbSettings['allowed_block_types'],
                    'template' => $dbSettings['template'],
                    'templateLock' => $dbSettings['template_lock']
                ];

                // Add to meta in expected format
                if (!isset($formattedMeta['blocks'])) {
                    $formattedMeta['blocks'] = [];
                }
                $formattedMeta['blocks']['settings'] = json_encode($blockSettings);
                $formattedMeta['blocks']['inner_blocks_settings'] = json_encode($innerBlocksSettings);
                $formattedMeta['blocks']['selected_partials'] = json_encode($dbSettings['selected_partials'] ?? []);
                $formattedMeta['blocks']['editor_selected_partials'] = json_encode($dbSettings['editor_selected_partials'] ?? []);
            }
        }

        // Load SCSS partial settings from database
        if ($isScssPartial) {
            $scssSettings = ScssPartialsSettingsRepository::get($post->ID);
            if ($scssSettings) {
                // Add to meta in expected format
                if (!isset($formattedMeta['scss_partials'])) {
                    $formattedMeta['scss_partials'] = [];
                }
                $formattedMeta['scss_partials']['is_global'] = $scssSettings['is_global'] ? '1' : '0';
                $formattedMeta['scss_partials']['global_order'] = (string) $scssSettings['global_order'];
            }
        }

        // Build basic post data
        $postData = [
            'id' => $post->ID,
            'title' => get_the_title($post->ID),
            'content' => $post->post_content,
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'date' => $post->post_date,
            'modified' => $post->post_modified,
            'terms' => $postTerms,
            'edit_url' => get_edit_post_link($post->ID),
            'meta' => $formattedMeta,
        ];

        // Add related data based on post type
        $relatedData = [];

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

        return $this->responseFormatter->success([
            'post' => $postData,
            'related' => $relatedData,
        ], ['performance' => $performanceData]);
    }
}