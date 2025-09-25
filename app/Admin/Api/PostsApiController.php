<?php

namespace Fanculo\Admin\Api;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\FilesManager\FilesManagerService;
use Fanculo\FilesManager\Services\DirectoryManager;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Admin\Api\Services\BulkQueryService;
use Fanculo\Admin\Api\ScssCompilerApiController;
use Fanculo\Admin\Api\BlockCategoriesApiController;
use Fanculo\Database\BlockSettingsRepository;

class PostsApiController
{
    private $bulkQueryService;

    public function __construct()
    {
        $this->bulkQueryService = new BulkQueryService();
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

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

        // Batch fetch multiple posts by IDs
        register_rest_route('funculo/v1', '/posts/batch', [
            'methods' => 'POST',
            'callback' => [$this, 'getBatchPosts'],
            'permission_callback' => [$this, 'checkPermissions'],
            'args' => [
                'post_ids' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 50;
                    }
                ],
                'include_meta' => [
                    'default' => true,
                    'type' => 'boolean',
                ],
            ],
        ]);

        // Batch update multiple posts
        register_rest_route('funculo/v1', '/posts/batch-update', [
            'methods' => 'PUT',
            'callback' => [$this, 'batchUpdatePosts'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'updates' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 20;
                    }
                ],
            ],
        ]);

        // Get post with all related data (partials, categories, etc.)
        register_rest_route('funculo/v1', '/post/(?P<id>\d+)/with-related', [
            'methods' => 'GET',
            'callback' => [$this, 'getPostWithRelated'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);

        // Bulk operations endpoint - execute multiple operations in single request
        register_rest_route('funculo/v1', '/operations/bulk', [
            'methods' => 'POST',
            'callback' => [$this, 'executeBulkOperations'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'operations' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 15;
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

    public function checkDeletePermissions()
    {
        return current_user_can('delete_posts');
    }

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
            return new \WP_REST_Response([
                'posts' => [],
                'total' => 0,
                'total_pages' => 0,
                'current_page' => $request->get_param('page'),
            ], 200);
        }

        // Extract post IDs for bulk operations
        $postIds = wp_list_pluck($query->posts, 'ID');

        // BULK OPERATION 1: Fetch all terms at once - eliminates N+1
        $allTerms = $this->bulkQueryService->getBulkPostTerms($postIds, FunculoTypeTaxonomy::getTaxonomy());

        // BULK OPERATION 2: Get optimized meta keys based on content types
        $optimizedMetaKeys = $this->bulkQueryService->getOptimizedMetaKeys($allTerms);

        // BULK OPERATION 3: Fetch all meta at once - eliminates N+1
        $allMeta = $this->bulkQueryService->getBulkPostMeta($postIds, $optimizedMetaKeys);

        // BULK OPERATION 4: Load block settings from database for blocks
        $blockSettingsMap = [];
        foreach ($postIds as $postId) {
            $postTerms = $allTerms[$postId] ?? [];
            foreach ($postTerms as $term) {
                if ($term['slug'] === 'blocks') {
                    $dbSettings = BlockSettingsRepository::get($postId);
                    if ($dbSettings) {
                        $blockSettingsMap[$postId] = $dbSettings;
                    }
                    break;
                }
            }
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
            }

            $posts[] = [
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
            ];
        }

        // Log performance improvement
        $this->bulkQueryService->logPerformance('getPosts', count($posts), $startTime);

        return new \WP_REST_Response([
            'posts' => $posts,
            'total' => $query->found_posts,
            'total_pages' => $query->max_num_pages,
            'current_page' => $request->get_param('page'),
        ], 200);
    }

    public function getPost($request)
    {
        $postId = $request->get_param('id');
        $post = get_post($postId);

        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return new \WP_Error('post_not_found', 'Post not found', ['status' => 404]);
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
        foreach ($postTerms as $term) {
            if ($term['slug'] === 'blocks') {
                $isBlock = true;
                break;
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
            }
        }

        return new \WP_REST_Response([
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
        ], 200);
    }

    public function createPost($request)
    {
        $title = $request->get_param('title');
        $taxonomyTerm = $request->get_param('taxonomy_term');
        $status = $request->get_param('status');

        // Create the post
        $postData = [
            'post_title' => $title,
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => $status,
            'post_author' => get_current_user_id(),
        ];

        $postId = wp_insert_post($postData);

        if (is_wp_error($postId)) {
            return new \WP_Error('post_creation_failed', 'Failed to create post', ['status' => 500]);
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

        return new \WP_REST_Response([
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
        ], 201);
    }

    public function updatePost($request)
    {
        $postId = $request->get_param('id');
        $metaData = $request->get_param('meta');
        $title = $request->get_param('title');

        $post = get_post($postId);
        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return new \WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        // Update post title and slug if provided
        if ($title) {
            // Generate slug from title
            $slug = sanitize_title($title);

            // Ensure slug is unique
            $slug = wp_unique_post_slug($slug, $postId, 'publish', FunculoPostType::getPostType(), 0);

            $updated = wp_update_post([
                'ID' => $postId,
                'post_title' => $title,
                'post_name' => $slug,
            ]);

            if (is_wp_error($updated)) {
                return new \WP_Error('title_update_failed', 'Failed to update post title and slug', ['status' => 500]);
            }
        }

        // Update meta fields if provided
        if ($metaData) {
            $this->updatePostMeta($postId, $metaData);
        }

        // Trigger file generation after meta update
        $post = get_post($postId);
        if ($post) {
            $filesManagerService = new FilesManagerService();
            $filesManagerService->generateFilesOnPostSave($postId, $post, true);
        }

        // Return updated post data
        return $this->getPost($request);
    }

    private function getPostMeta($postId, $terms)
    {
        $meta = [];

        foreach ($terms as $term) {
            switch ($term['slug']) {
                case FunculoTypeTaxonomy::getTermBlocks():
                    // Get settings from database table
                    $dbSettings = BlockSettingsRepository::get($postId);

                    // Build settings JSON from database data
                    $settingsData = [];
                    $innerBlocksData = [];

                    if ($dbSettings) {
                        // Block settings (for _funculo_block_settings)
                        $settingsData = [
                            'category' => $dbSettings['category'],
                            'description' => $dbSettings['description'],
                            'icon' => $dbSettings['icon'],
                        ];

                        // Add innerBlocks to settings if template exists
                        if (!empty($dbSettings['template']) || !empty($dbSettings['template_lock'])) {
                            $settingsData['innerBlocks'] = [];
                            if (!empty($dbSettings['template'])) {
                                // Convert back to nested array format for compatibility
                                $templateArray = [];
                                foreach ($dbSettings['template'] as $blockName) {
                                    $templateArray[] = [$blockName];
                                }
                                $settingsData['innerBlocks']['template'] = $templateArray;
                            }
                            if (!empty($dbSettings['template_lock'])) {
                                $settingsData['innerBlocks']['templateLock'] = $dbSettings['template_lock'] === 'true' || $dbSettings['template_lock'] === '1';
                            }
                        }

                        // Inner blocks settings (for _funculo_block_inner_blocks_settings)
                        $innerBlocksData = [
                            'enabled' => $dbSettings['supports_inner_blocks'],
                            'allowed_blocks' => $dbSettings['allowed_block_types'] ?? [],
                        ];
                    }

                    $meta['blocks'] = [
                        'php' => get_post_meta($postId, MetaKeysConstants::BLOCK_PHP, true),
                        'scss' => get_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, true),
                        'editorScss' => get_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, true),
                        'js' => get_post_meta($postId, MetaKeysConstants::BLOCK_JS, true),
                        'attributes' => get_post_meta($postId, MetaKeysConstants::BLOCK_ATTRIBUTES, true),
                        'settings' => !empty($settingsData) ? json_encode($settingsData) : '',
                        'selected_partials' => get_post_meta($postId, MetaKeysConstants::BLOCK_SELECTED_PARTIALS, true),
                        'inner_blocks_settings' => !empty($innerBlocksData) ? json_encode($innerBlocksData) : '',
                    ];
                    break;

                case FunculoTypeTaxonomy::getTermSymbols():
                    $meta['symbols'] = [
                        'php' => get_post_meta($postId, MetaKeysConstants::SYMBOL_PHP, true),
                    ];
                    break;

                case FunculoTypeTaxonomy::getTermScssPartials():
                    $meta['scss_partials'] = [
                        'scss' => get_post_meta($postId, MetaKeysConstants::SCSS_PARTIAL_SCSS, true),
                    ];
                    break;
            }
        }

        return $meta;
    }

    private function updatePostMeta($postId, $metaData)
    {
        // Update blocks meta
        if (isset($metaData['blocks'])) {
            $blocks = $metaData['blocks'];
            if (isset($blocks['php'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_PHP, wp_unslash($blocks['php']));
            }
            if (isset($blocks['scss'])) {
                $scssContent = sanitize_textarea_field($blocks['scss']);
                update_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, $scssContent);

                // If SCSS content is empty, also clear compiled CSS
                if (empty($scssContent)) {
                    update_post_meta($postId, MetaKeysConstants::CSS_CONTENT, '');
                }
            }
            if (isset($blocks['editorScss'])) {
                $editorScssContent = sanitize_textarea_field($blocks['editorScss']);
                update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, $editorScssContent);

                // If editor SCSS content is empty, also clear compiled editor CSS
                if (empty($editorScssContent)) {
                    update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, '');
                }
            }
            if (isset($blocks['js'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_JS, sanitize_textarea_field($blocks['js']));
            }
            if (isset($blocks['attributes'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_ATTRIBUTES, sanitize_textarea_field($blocks['attributes']));
            }
            // Save block settings to database table
            $dbSettings = [];

            // Parse block settings JSON (from _funculo_block_settings)
            if (isset($blocks['settings'])) {
                $settingsJson = sanitize_textarea_field($blocks['settings']);
                $settingsData = json_decode($settingsJson, true);
                if ($settingsData) {
                    $dbSettings['category'] = $settingsData['category'] ?? null;
                    $dbSettings['description'] = $settingsData['description'] ?? null;
                    $dbSettings['icon'] = $settingsData['icon'] ?? null;

                    // InnerBlocks template settings from block settings
                    if (isset($settingsData['innerBlocks'])) {
                        // Extract block names from template structure
                        if (isset($settingsData['innerBlocks']['template']) && is_array($settingsData['innerBlocks']['template'])) {
                            $templateBlocks = [];
                            foreach ($settingsData['innerBlocks']['template'] as $block) {
                                if (is_array($block) && !empty($block[0])) {
                                    // Extract just the block name (e.g., "core/paragraph")
                                    $templateBlocks[] = str_replace('\\/', '/', $block[0]);
                                }
                            }
                            $dbSettings['template'] = $templateBlocks;
                        }
                        $dbSettings['template_lock'] = $settingsData['innerBlocks']['templateLock'] ?? null;
                    }
                }
            }

            // Parse inner blocks settings JSON (from _funculo_block_inner_blocks_settings)
            if (isset($blocks['inner_blocks_settings'])) {
                $innerBlocksJson = sanitize_textarea_field($blocks['inner_blocks_settings']);
                $innerBlocksData = json_decode($innerBlocksJson, true);
                if ($innerBlocksData) {
                    // Check for 'enabled' field instead of 'supportsInnerBlocks'
                    $dbSettings['supports_inner_blocks'] = !empty($innerBlocksData['enabled']);
                    // Use 'allowed_blocks' instead of 'allowedBlocks'
                    $dbSettings['allowed_block_types'] = $innerBlocksData['allowed_blocks'] ?? [];
                    // Also save template and templateLock from inner_blocks_settings
                    $dbSettings['template'] = $innerBlocksData['template'] ?? [];
                    $dbSettings['template_lock'] = $innerBlocksData['templateLock'] ?? null;
                }
            }

            // Save to database table if we have settings
            if (!empty($dbSettings)) {
                BlockSettingsRepository::save($postId, $dbSettings);
            }

            // Keep saving selected partials to post meta for now
            if (isset($blocks['selected_partials'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_SELECTED_PARTIALS, sanitize_textarea_field($blocks['selected_partials']));
            }
        }

        // Update symbols meta
        if (isset($metaData['symbols'])) {
            $symbols = $metaData['symbols'];
            if (isset($symbols['php'])) {
                update_post_meta($postId, MetaKeysConstants::SYMBOL_PHP, wp_unslash($symbols['php']));
            }
        }

        // Update SCSS partials meta
        if (isset($metaData['scss_partials'])) {
            $scssPartials = $metaData['scss_partials'];
            if (isset($scssPartials['scss'])) {
                update_post_meta($postId, MetaKeysConstants::SCSS_PARTIAL_SCSS, sanitize_textarea_field($scssPartials['scss']));
            }
        }
    }

    public function deletePost($request)
    {
        $postId = $request->get_param('id');
        $post = get_post($postId);

        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return new \WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        // Get post terms to determine what files to delete
        $terms = wp_get_post_terms($post->ID, FunculoTypeTaxonomy::getTaxonomy());
        $directoryManager = new DirectoryManager();

        // Delete associated files based on post type
        foreach ($terms as $term) {
            switch ($term->slug) {
                case FunculoTypeTaxonomy::getTermBlocks():
                    // Delete block folder in fanculo-blocks directory
                    $directoryManager->deleteBlockDirectory($post->post_name);
                    break;

                case FunculoTypeTaxonomy::getTermSymbols():
                    // Delete symbols file
                    $directoryManager->deleteFile('symbols/' . $post->post_name . '.php');
                    break;

                case FunculoTypeTaxonomy::getTermScssPartials():
                    // Delete SCSS partial file
                    $directoryManager->deleteFile('scss/' . $post->post_name . '.scss');
                    break;
            }
        }

        // Delete block settings from database table
        BlockSettingsRepository::delete($postId);

        // Permanently delete the post (skip trash)
        $deleted = wp_delete_post($postId, true);

        if (!$deleted) {
            return new \WP_Error('delete_failed', 'Failed to delete post', ['status' => 500]);
        }

        return new \WP_REST_Response([
            'success' => true,
            'message' => 'Post and associated files deleted successfully'
        ], 200);
    }

    // ===========================================
    // BATCH API ENDPOINTS - Phase 2.3
    // ===========================================

    /**
     * Batch fetch multiple posts by IDs
     * Optimized to reduce multiple individual API calls
     */
    public function getBatchPosts($request)
    {
        $startTime = microtime(true);
        $postIds = $request->get_param('post_ids');
        $includeMeta = $request->get_param('include_meta');

        // Validate post IDs
        $validPostIds = [];
        foreach ($postIds as $postId) {
            if (is_numeric($postId)) {
                $validPostIds[] = (int)$postId;
            }
        }

        if (empty($validPostIds)) {
            return new \WP_Error('invalid_post_ids', 'No valid post IDs provided', ['status' => 400]);
        }

        // Get posts using WP_Query for better performance
        $args = [
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'post__in' => $validPostIds,
            'posts_per_page' => count($validPostIds),
            'orderby' => 'post__in', // Maintain order
        ];

        $query = new \WP_Query($args);

        if (empty($query->posts)) {
            return new \WP_REST_Response([
                'posts' => [],
                'found' => 0,
                'not_found' => $validPostIds,
            ], 200);
        }

        $foundPostIds = wp_list_pluck($query->posts, 'ID');
        $notFoundIds = array_diff($validPostIds, $foundPostIds);

        $posts = [];

        if ($includeMeta) {
            // Use bulk operations for meta and terms
            $allTerms = $this->bulkQueryService->getBulkPostTerms($foundPostIds, FunculoTypeTaxonomy::getTaxonomy());
            $optimizedMetaKeys = $this->bulkQueryService->getOptimizedMetaKeys($allTerms);
            $allMeta = $this->bulkQueryService->getBulkPostMeta($foundPostIds, $optimizedMetaKeys);

            foreach ($query->posts as $post) {
                $postTerms = $allTerms[$post->ID] ?? [];
                $postMeta = $allMeta[$post->ID] ?? [];

                $posts[] = [
                    'id' => $post->ID,
                    'title' => get_the_title($post->ID),
                    'content' => $post->post_content,
                    'slug' => $post->post_name,
                    'status' => $post->post_status,
                    'date' => $post->post_date,
                    'modified' => $post->post_modified,
                    'terms' => $postTerms,
                    'edit_url' => get_edit_post_link($post->ID),
                    'meta' => $this->bulkQueryService->formatPostMeta($postMeta, $postTerms),
                ];
            }
        } else {
            // Basic data only - no meta fetch
            foreach ($query->posts as $post) {
                $posts[] = [
                    'id' => $post->ID,
                    'title' => get_the_title($post->ID),
                    'slug' => $post->post_name,
                    'status' => $post->post_status,
                    'date' => $post->post_date,
                    'modified' => $post->post_modified,
                    'excerpt' => wp_trim_words($post->post_content, 20),
                    'edit_url' => get_edit_post_link($post->ID),
                ];
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('getBatchPosts', count($posts), $startTime);

        return new \WP_REST_Response([
            'posts' => $posts,
            'found' => count($posts),
            'not_found' => $notFoundIds,
            'requested' => count($validPostIds),
        ], 200);
    }

    /**
     * Batch update multiple posts
     * Allows updating multiple posts in a single API call
     */
    public function batchUpdatePosts($request)
    {
        $startTime = microtime(true);
        $updates = $request->get_param('updates');
        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($updates),
        ];

        foreach ($updates as $update) {
            if (!isset($update['id']) || !is_numeric($update['id'])) {
                $results['failed'][] = [
                    'id' => $update['id'] ?? 'unknown',
                    'error' => 'Invalid post ID',
                ];
                continue;
            }

            $postId = (int)$update['id'];
            $post = get_post($postId);

            if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
                $results['failed'][] = [
                    'id' => $postId,
                    'error' => 'Post not found',
                ];
                continue;
            }

            try {
                // Update post title and slug if provided
                if (isset($update['title'])) {
                    $slug = sanitize_title($update['title']);
                    $slug = wp_unique_post_slug($slug, $postId, 'publish', FunculoPostType::getPostType(), 0);

                    $updated = wp_update_post([
                        'ID' => $postId,
                        'post_title' => $update['title'],
                        'post_name' => $slug,
                    ]);

                    if (is_wp_error($updated)) {
                        throw new \Exception('Failed to update post title: ' . $updated->get_error_message());
                    }
                }

                // Update meta fields if provided
                if (isset($update['meta'])) {
                    $this->updatePostMeta($postId, $update['meta']);
                }

                // Trigger file generation if requested
                if (isset($update['regenerate_files']) && $update['regenerate_files']) {
                    $post = get_post($postId);
                    if ($post) {
                        $filesManagerService = new FilesManagerService();
                        $filesManagerService->generateFilesOnPostSave($postId, $post, true);
                    }
                }

                $results['successful'][] = [
                    'id' => $postId,
                    'title' => get_the_title($postId),
                ];

            } catch (\Exception $e) {
                $results['failed'][] = [
                    'id' => $postId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('batchUpdatePosts', $results['total'], $startTime);

        $statusCode = empty($results['failed']) ? 200 : 207; // 207 Multi-Status for partial success

        return new \WP_REST_Response($results, $statusCode);
    }

    /**
     * Get post with all related data in a single request
     * Combines post data with partials, categories, and other related information
     */
    public function getPostWithRelated($request)
    {
        $startTime = microtime(true);
        $postId = $request->get_param('id');
        $post = get_post($postId);

        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return new \WP_Error('post_not_found', 'Post not found', ['status' => 404]);
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
        foreach ($postTerms as $term) {
            if ($term['slug'] === 'blocks') {
                $isBlock = true;
                break;
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

        return new \WP_REST_Response([
            'post' => $postData,
            'related' => $relatedData,
        ], 200);
    }

    /**
     * Execute multiple operations in a single request
     * Allows combining different operations to reduce round trips
     */
    public function executeBulkOperations($request)
    {
        $startTime = microtime(true);
        $operations = $request->get_param('operations');
        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($operations),
        ];

        foreach ($operations as $index => $operation) {
            if (!isset($operation['type']) || !isset($operation['data'])) {
                $results['failed'][] = [
                    'index' => $index,
                    'error' => 'Operation must have type and data',
                ];
                continue;
            }

            try {
                $result = $this->executeOperation($operation['type'], $operation['data']);
                $results['successful'][] = [
                    'index' => $index,
                    'type' => $operation['type'],
                    'result' => $result,
                ];
            } catch (\Exception $e) {
                $results['failed'][] = [
                    'index' => $index,
                    'type' => $operation['type'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('executeBulkOperations', $results['total'], $startTime);

        $statusCode = empty($results['failed']) ? 200 : 207;

        return new \WP_REST_Response($results, $statusCode);
    }

    /**
     * Execute a single operation within bulk operations
     */
    private function executeOperation($type, $data)
    {
        switch ($type) {
            case 'get_post':
                if (!isset($data['id'])) {
                    throw new \Exception('Post ID required for get_post operation');
                }
                $post = get_post($data['id']);
                if (!$post) {
                    throw new \Exception('Post not found');
                }
                return ['id' => $post->ID, 'title' => $post->post_title];

            case 'update_meta':
                if (!isset($data['post_id']) || !isset($data['meta'])) {
                    throw new \Exception('Post ID and meta data required for update_meta operation');
                }
                $this->updatePostMeta($data['post_id'], $data['meta']);
                return ['post_id' => $data['post_id'], 'updated' => true];

            case 'regenerate_files':
                if (!isset($data['post_id'])) {
                    throw new \Exception('Post ID required for regenerate_files operation');
                }
                $post = get_post($data['post_id']);
                if ($post) {
                    $filesManagerService = new FilesManagerService();
                    $filesManagerService->generateFilesOnPostSave($data['post_id'], $post, true);
                }
                return ['post_id' => $data['post_id'], 'regenerated' => true];

            default:
                throw new \Exception('Unknown operation type: ' . esc_html($type));
        }
    }
}