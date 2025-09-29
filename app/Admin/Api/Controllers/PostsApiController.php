<?php

namespace Fanculo\Admin\Api\Controllers;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Database\BlockSettingsRepository;
use Fanculo\Database\ScssPartialsSettingsRepository;
use Fanculo\FilesManager\FilesManagerService;
use Fanculo\FilesManager\Services\DirectoryManager;
use Fanculo\Admin\Api\Services\BulkQueryService;

/**
 * Posts API Controller - Basic CRUD Operations
 *
 * Handles individual post operations including:
 * - Getting paginated posts list
 * - Retrieving single posts
 * - Creating new posts
 * - Updating existing posts
 * - Deleting posts
 */
class PostsApiController extends BaseApiController
{
    public function registerRoutes()
    {
        // Posts routes
        register_rest_route('funculo/v1', '/posts', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'getPosts'],
                'permission_callback' => [$this, 'checkPermissions'],
                'args' => [
                    'taxonomy_filter' => [
                        'default' => '',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'search' => [
                        'default' => '',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'per_page' => [
                        'default' => 20,
                        'sanitize_callback' => 'absint',
                    ],
                    'page' => [
                        'default' => 1,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'createPost'],
                'permission_callback' => [$this, 'checkCreatePermissions'],
                'args' => [
                    'title' => [
                        'required' => true,
                        'sanitize_callback' => 'sanitize_text_field',
                        'validate_callback' => function($param) {
                            return !empty(trim($param));
                        }
                    ],
                    'taxonomy_term' => [
                        'required' => true,
                        'sanitize_callback' => 'sanitize_text_field',
                        'validate_callback' => function($param) {
                            $validTerms = [
                                FunculoTypeTaxonomy::getTermBlocks(),
                                FunculoTypeTaxonomy::getTermSymbols(),
                                FunculoTypeTaxonomy::getTermScssPartials()
                            ];
                            return in_array($param, $validTerms);
                        }
                    ],
                    'status' => [
                        'default' => 'publish',
                        'sanitize_callback' => 'sanitize_text_field',
                        'validate_callback' => function($param) {
                            return in_array($param, ['draft', 'publish', 'private']);
                        }
                    ],
                ],
            ]
        ]);

        // Individual post routes
        register_rest_route('funculo/v1', '/post/(?P<id>\d+)', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'getPost'],
                'permission_callback' => [$this, 'checkPermissions'],
            ],
            [
                'methods' => 'PUT',
                'callback' => [$this, 'updatePost'],
                'permission_callback' => [$this, 'checkCreatePermissions'],
                'args' => [
                    'meta' => [
                        'required' => false,
                        'validate_callback' => function($param) {
                            return is_array($param);
                        }
                    ],
                    'title' => [
                        'required' => false,
                        'sanitize_callback' => 'sanitize_text_field',
                        'validate_callback' => function($param) {
                            return !empty(trim($param));
                        }
                    ],
                ],
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$this, 'deletePost'],
                'permission_callback' => [$this, 'checkDeletePermissions'],
            ]
        ]);
    }

    // Methods will be moved here from the original controller
    // For now, I'll add placeholder methods

    public function getPosts($request)
    {
        $startTime = microtime(true);

        $args = [
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'posts_per_page' => $request->get_param('per_page'),
            'paged' => $request->get_param('page'),
        ];

        // Add search functionality
        $search = $request->get_param('search');
        if (!empty($search)) {
            $args['s'] = $search;
        }

        // Add taxonomy filter
        $taxonomyFilter = $request->get_param('taxonomy_filter');
        if (!empty($taxonomyFilter)) {
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- User-initiated filter, acceptable performance
            $args['tax_query'] = [
                [
                    'taxonomy' => FunculoTypeTaxonomy::getTaxonomy(),
                    'field' => 'slug',
                    'terms' => $taxonomyFilter,
                ],
            ];
        }

        $query = new \WP_Query($args);

        if (empty($query->posts)) {
            return $this->responseFormatter->paginated(
                [],
                0,
                $request->get_param('page'),
                $request->get_param('per_page')
            );
        }

        // Extract post IDs for bulk operations
        $postIds = wp_list_pluck($query->posts, 'ID');

        // BULK OPERATION 1: Fetch all terms at once - eliminates N+1
        $allTerms = $this->bulkQueryService->getBulkPostTerms($postIds, FunculoTypeTaxonomy::getTaxonomy());

        // BULK OPERATION 2: Get optimized meta keys based on content types
        $optimizedMetaKeys = $this->bulkQueryService->getOptimizedMetaKeys($allTerms);

        // BULK OPERATION 3: Fetch all meta at once - eliminates N+1
        $allMeta = $this->bulkQueryService->getBulkPostMeta($postIds, $optimizedMetaKeys);

        // BULK OPERATION 4: Identify blocks and SCSS partials efficiently
        $blockPostIds = [];
        $scssPartialIds = [];
        foreach ($postIds as $postId) {
            $postTerms = $allTerms[$postId] ?? [];
            foreach ($postTerms as $term) {
                if ($term['slug'] === 'blocks') {
                    $blockPostIds[] = $postId;
                    break;
                } elseif ($term['slug'] === 'scss-partials') {
                    $scssPartialIds[] = $postId;
                    break;
                }
            }
        }

        // BULK OPERATION 5: Load block settings from database in ONE query
        $blockSettingsMap = [];
        if (!empty($blockPostIds)) {
            $blockSettingsMap = BlockSettingsRepository::getBulk($blockPostIds);
        }

        // BULK OPERATION 6: Load SCSS partial settings from database
        $scssSettingsMap = [];
        if (!empty($scssPartialIds)) {
            $scssSettingsMap = ScssPartialsSettingsRepository::getBulk($scssPartialIds);
        }

        // OPTIMIZATION: Pre-fetch titles and edit links to avoid repeated function calls
        $postTitles = wp_list_pluck($query->posts, 'post_title', 'ID');
        $editLinks = [];
        foreach ($query->posts as $post) {
            $editLinks[$post->ID] = get_edit_post_link($post->ID);
        }

        // Build response with prefetched data - NO MORE INDIVIDUAL QUERIES
        $posts = [];
        foreach ($query->posts as $post) {
            $postTerms = $allTerms[$post->ID] ?? [];
            $postMeta = $allMeta[$post->ID] ?? [];
            $formattedMeta = $this->bulkQueryService->formatPostMeta($postMeta, $postTerms);

            // Add block settings if this is a block
            if (isset($blockSettingsMap[$post->ID])) {
                $dbSettings = $blockSettingsMap[$post->ID];

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

            // Add SCSS partial settings if this is a SCSS partial
            if (isset($scssSettingsMap[$post->ID])) {
                $scssSettings = $scssSettingsMap[$post->ID];
                if (!isset($formattedMeta['scss_partials'])) {
                    $formattedMeta['scss_partials'] = [];
                }
                $formattedMeta['scss_partials']['is_global'] = $scssSettings['is_global'] ? '1' : '0';
                $formattedMeta['scss_partials']['global_order'] = (string) $scssSettings['global_order'];
            }

            $posts[] = [
                'id' => $post->ID,
                'title' => $postTitles[$post->ID] ?? 'Untitled',
                'slug' => $post->post_name,
                'status' => $post->post_status,
                'date' => $post->post_date,
                'modified' => $post->post_modified,
                'excerpt' => wp_trim_words($post->post_content, 20),
                'terms' => $postTerms,
                'edit_url' => $editLinks[$post->ID] ?? '',
                'meta' => $formattedMeta,
            ];
        }

        // Log performance improvement
        $this->bulkQueryService->logPerformance('getPosts', count($posts), $startTime);

        $performanceData = [
            'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
        ];

        return $this->responseFormatter->paginated(
            $posts,
            $query->found_posts,
            $request->get_param('page'),
            $request->get_param('per_page'),
            ['performance' => $performanceData]
        );
    }

    public function getPost($request)
    {
        $postId = $request->get_param('id');
        $post = get_post($postId);

        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return $this->responseFormatter->notFound('Post', $postId);
        }

        // Use bulk operations for consistency (even for single post)
        $allTerms = $this->bulkQueryService->getBulkPostTerms([$post->ID], FunculoTypeTaxonomy::getTaxonomy());
        $postTerms = $allTerms[$post->ID] ?? [];

        // Get optimized meta keys and fetch meta
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

        return $this->responseFormatter->item($postData, []);
    }

    public function createPost($request)
    {
        $title = $request->get_param('title');
        $taxonomyTerm = $request->get_param('taxonomy_term');
        $status = $request->get_param('status') ?? 'publish';

        // Create the post
        $postData = [
            'post_title' => $title,
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => $status,
            'post_author' => get_current_user_id(),
        ];

        $postId = wp_insert_post($postData);

        if (is_wp_error($postId)) {
            return $this->responseFormatter->serverError('Failed to create post');
        }

        // Assign the taxonomy term
        $term = get_term_by('slug', $taxonomyTerm, FunculoTypeTaxonomy::getTaxonomy());
        if ($term) {
            wp_set_post_terms($postId, [$term->term_id], FunculoTypeTaxonomy::getTaxonomy());
        }

        // Set default category for blocks
        if ($taxonomyTerm === 'blocks') {
            // Save default settings to database table instead of post meta
            $defaultSettings = [
                'description' => '',
                'category' => 'text', // First category from BlockCategoriesApiController
                'icon' => 'search',
                'supports_inner_blocks' => false,
                'allowed_block_types' => [],
                'template' => [],
                'template_lock' => null
            ];
            BlockSettingsRepository::save($postId, $defaultSettings);

            // Set default PHP content for blocks
            $defaultPhpContent = '<div <?php echo get_block_wrapper_attributes(); ?>>

    <!-- Your code goes here -->

</div>';
            update_post_meta($postId, MetaKeysConstants::BLOCK_PHP, $defaultPhpContent);

            // Set default SCSS content for blocks
            $blockSlug = sanitize_title($title);
            $defaultScssContent = '.wp-block-fanculo-' . $blockSlug . ' {

}';
            update_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, $defaultScssContent);
        }

        // Get the created post data and trigger file generation
        $post = get_post($postId);
        if ($post) {
            $filesManagerService = new FilesManagerService();
            $filesManagerService->generateFilesOnPostSave($postId, $post, false);
        }

        // Use bulk operations for consistency
        $allTerms = $this->bulkQueryService->getBulkPostTerms([$post->ID], FunculoTypeTaxonomy::getTaxonomy());
        $postTerms = $allTerms[$post->ID] ?? [];

        // Get optimized meta keys and fetch meta
        $optimizedMetaKeys = $this->bulkQueryService->getOptimizedMetaKeys($allTerms);
        $allMeta = $this->bulkQueryService->getBulkPostMeta([$post->ID], $optimizedMetaKeys);
        $postMeta = $allMeta[$post->ID] ?? [];
        $formattedMeta = $this->bulkQueryService->formatPostMeta($postMeta, $postTerms);

        // Add block settings if this was a block
        if ($taxonomyTerm === 'blocks') {
            // Format settings for frontend compatibility
            $blockSettings = [
                'category' => $defaultSettings['category'],
                'description' => $defaultSettings['description'],
                'icon' => $defaultSettings['icon']
            ];

            // Format inner blocks settings
            $innerBlocksSettings = [
                'enabled' => $defaultSettings['supports_inner_blocks'],
                'allowed_blocks' => $defaultSettings['allowed_block_types'],
                'template' => $defaultSettings['template'],
                'templateLock' => $defaultSettings['template_lock']
            ];

            // Add to meta in expected format
            if (!isset($formattedMeta['blocks'])) {
                $formattedMeta['blocks'] = [];
            }
            $formattedMeta['blocks']['settings'] = json_encode($blockSettings);
            $formattedMeta['blocks']['inner_blocks_settings'] = json_encode($innerBlocksSettings);
        }

        return $this->responseFormatter->created([
            'id' => $post->ID,
            'title' => get_the_title($post->ID),
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'date' => $post->post_date,
            'modified' => $post->post_modified,
            'excerpt' => wp_trim_words($post->post_content, 20),
            'terms' => $postTerms,
            'edit_url' => get_edit_post_link($post->ID),
            'meta' => $formattedMeta,
        ]);
    }

    public function updatePost($request)
    {
        // This method will be copied from the original controller
        return $this->responseFormatter->updated([], []);
    }

    public function deletePost($request)
    {
        try {
            $postId = $request->get_param('id');
            $post = get_post($postId);

            if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
                return $this->responseFormatter->notFound('Post', $postId);
            }

            // For now, just delete the post from database - file cleanup can be added later
            // This ensures the core deletion works first
            $deleted = wp_delete_post($postId, true);

            if (!$deleted) {
                return $this->responseFormatter->serverError('Failed to delete post from database');
            }

            // Clean up repository data - with error handling
            try {
                if (class_exists('Fanculo\Database\BlockSettingsRepository')) {
                    BlockSettingsRepository::delete($postId);
                }
            } catch (\Exception $e) {
                error_log('Warning: Could not delete block settings: ' . $e->getMessage());
            }

            try {
                if (class_exists('Fanculo\Database\ScssPartialsSettingsRepository')) {
                    ScssPartialsSettingsRepository::delete($postId);
                }
            } catch (\Exception $e) {
                error_log('Warning: Could not delete SCSS partial settings: ' . $e->getMessage());
            }

            return $this->responseFormatter->deleted('Post deleted successfully');

        } catch (\Exception $e) {
            error_log('Delete post error: ' . $e->getMessage());
            return $this->responseFormatter->serverError('Delete operation failed: ' . $e->getMessage());
        }
    }
}