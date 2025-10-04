<?php

namespace FanCoolo\Admin\Api\Controllers;

use FanCoolo\Content\FunculoPostType;
use FanCoolo\Content\FunculoTypeTaxonomy;
use FanCoolo\Admin\Api\Services\MetaKeysConstants;
use FanCoolo\Database\BlockSettingsRepository;
use FanCoolo\Database\ScssPartialsSettingsRepository;
use FanCoolo\FilesManager\FilesManagerService;
use FanCoolo\FilesManager\Services\DirectoryManager;
use FanCoolo\Admin\Api\Services\BulkQueryService;

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
                    'search' => [
                        'type' => 'string',
                        'default' => '',
                        'sanitize_callback' => 'sanitize_text_field'
                    ],
                    'per_page' => [
                        'type' => 'integer',
                        'default' => 20,
                        'sanitize_callback' => function($value) {
                            return min(100, max(1, intval($value)));
                        }
                    ],
                    'page' => [
                        'type' => 'integer',
                        'default' => 1,
                        'sanitize_callback' => function($value) {
                            return max(1, intval($value));
                        }
                    ],
                    'status' => [
                        'type' => 'string',
                        'default' => 'publish',
                        'sanitize_callback' => 'sanitize_text_field'
                    ],
                    'taxonomy_filter' => [
                        'type' => 'string',
                        'default' => '',
                        'sanitize_callback' => 'sanitize_text_field',
                        'validate_callback' => function($param) {
                            return empty($param) || in_array($param, ['blocks', 'symbols', 'scss-partials']);
                        }
                    ]
                ],
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'createPost'],
                'permission_callback' => [$this, 'checkCreatePermissions'],
                'args' => [
                    'title' => [
                        'type' => 'string',
                        'required' => true,
                        'sanitize_callback' => 'sanitize_text_field',
                        'validate_callback' => function($param) {
                            return !empty(trim($param)) && strlen($param) <= 255;
                        }
                    ],
                    'taxonomy_term' => [
                        'type' => 'string',
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
                        'type' => 'string',
                        'default' => 'publish',
                        'sanitize_callback' => 'sanitize_text_field'
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
                        'type' => 'array',
                        'required' => false,
                        'sanitize_callback' => function($value) {
                            // Simple sanitization for nested meta data
                            if (!is_array($value)) return [];
                            return $this->sanitizeMetaSimple($value);
                        },
                        'validate_callback' => function($param) {
                            return is_array($param);
                        }
                    ],
                    'title' => [
                        'type' => 'string',
                        'required' => false,
                        'sanitize_callback' => 'sanitize_text_field',
                        'validate_callback' => function($param) {
                            return !empty(trim($param)) && strlen($param) <= 255;
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

        // Execute standardized bulk pipeline (Steps 2-6)
        $pipelineResult = $this->standardBulkPipeline->executeBulkPipeline($postIds);

        // Build response using standardized formatting
        $formatOptions = [
            'applyDatabaseSettingsFormatting' => true,
            'includeEditUrl' => true,
            'includeExcerpt' => true,
            'includeDates' => true,
            'excerptLength' => 20
        ];

        $posts = [];
        foreach ($query->posts as $post) {
            $posts[] = $this->standardBulkPipeline->formatPostData($post, $pipelineResult, $formatOptions);
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
                $selectedPartials = $dbSettings['selected_partials'] ?? [];
                error_log("FanCoolo Debug: PostsApiController getPost - selected_partials type: " . gettype($selectedPartials) . ", is_array: " . (is_array($selectedPartials) ? 'YES' : 'NO') . ", count: " . (is_array($selectedPartials) ? count($selectedPartials) : 'N/A') . ", content: " . json_encode($selectedPartials));
                $formattedMeta['blocks']['selected_partials'] = json_encode($selectedPartials);
                error_log("FanCoolo Debug: PostsApiController getPost - final JSON to send: " . $formattedMeta['blocks']['selected_partials']);
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
            $defaultScssContent = '.wp-block-fancoolo-' . $blockSlug . ' {

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
        $postId = $request->get_param('id');
        $post = get_post($postId);

        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return $this->responseFormatter->notFound('Post', $postId);
        }

        try {
            // Parameters are already sanitized by route args
            $title = $request->get_param('title');
            $meta = $request->get_param('meta');

            // Update title if provided
            if (!empty($title)) {
                wp_update_post([
                    'ID' => $postId,
                    'post_title' => $title, // Already sanitized
                ]);
            }

            // Update meta if provided
            if (!empty($meta) && is_array($meta)) {
                // Meta is already sanitized by sanitizeNestedMeta
                foreach ($meta as $category => $data) {
                    if (!is_array($data)) continue;

                    // Handle SCSS partial settings separately (save to database table)
                    if ($category === 'scss_partials') {
                        $scssSettings = [];

                        foreach ($data as $key => $value) {
                            if ($key === 'is_global') {
                                $scssSettings['is_global'] = ($value === '1' || $value === 1 || $value === true);
                            } elseif ($key === 'global_order') {
                                $scssSettings['global_order'] = (int) $value;
                            } elseif ($key === 'scss') {
                                // SCSS content goes to post meta
                                $meta_key = $this->buildMetaKey($category, $key);
                                if ($meta_key) {
                                    update_post_meta($postId, $meta_key, $value);
                                }
                            }
                        }

                        // Save SCSS settings to database table if we have any
                        if (!empty($scssSettings)) {
                            ScssPartialsSettingsRepository::save($postId, $scssSettings);
                        }
                    } else {
                        // Handle other meta normally
                        foreach ($data as $key => $value) {
                            // Construct proper meta key
                            $meta_key = $this->buildMetaKey($category, $key);
                            if ($meta_key) {
                                update_post_meta($postId, $meta_key, $value);
                            }
                        }
                    }
                }
            }

            // Trigger file generation if meta was updated
            if (!empty($meta)) {
                error_log("FanCoolo Debug: Starting file generation for post ID: $postId");
                error_log("FanCoolo Debug: Meta data: " . print_r($meta, true));

                $filesManagerService = new FilesManagerService();
                $result = $filesManagerService->generateFilesOnPostSave($postId, $post, true);

                error_log("FanCoolo Debug: File generation result: " . print_r($result, true));
            }

            // Get updated post data using bulk operations for consistency
            $allTerms = $this->bulkQueryService->getBulkPostTerms([$post->ID], FunculoTypeTaxonomy::getTaxonomy());
            $postTerms = $allTerms[$post->ID] ?? [];

            $optimizedMetaKeys = $this->bulkQueryService->getOptimizedMetaKeys($allTerms);
            $allMeta = $this->bulkQueryService->getBulkPostMeta([$post->ID], $optimizedMetaKeys);
            $postMeta = $allMeta[$post->ID] ?? [];
            $formattedMeta = $this->bulkQueryService->formatPostMeta($postMeta, $postTerms);

            // Check if this is an SCSS partial and add settings from database
            $isScssPartial = !empty($postTerms) && in_array('scss-partials', array_column($postTerms, 'slug'));
            if ($isScssPartial) {
                $scssSettings = ScssPartialsSettingsRepository::get($post->ID);
                if ($scssSettings) {
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
                'slug' => $post->post_name,
                'status' => $post->post_status,
                'date' => $post->post_date,
                'modified' => $post->post_modified,
                'terms' => $postTerms,
                'edit_url' => get_edit_post_link($post->ID),
                'meta' => $formattedMeta,
            ];

            return $this->responseFormatter->updated($postData, []);

        } catch (\Exception $e) {
            error_log('Update post error: ' . $e->getMessage());
            return $this->responseFormatter->serverError('Update operation failed: ' . $e->getMessage());
        }
    }

    /**
     * Simple sanitization for nested meta data
     */
    private function sanitizeMetaSimple($metaData)
    {
        if (!is_array($metaData)) return [];

        $sanitized = [];
        foreach ($metaData as $category => $data) {
            $sanitizedCategory = sanitize_key($category);
            if (!is_array($data)) continue;

            $sanitized[$sanitizedCategory] = [];
            foreach ($data as $key => $value) {
                $sanitizedKey = sanitize_key($key);

                // Different sanitization based on key type
                switch ($key) {
                    case 'php':
                        // For PHP code, preserve content but ensure it's a string
                        $sanitized[$sanitizedCategory][$sanitizedKey] = is_string($value) ? $value : '';
                        break;
                    case 'scss':
                    case 'editorScss':
                        // For SCSS code, preserve content but ensure it's a string
                        $sanitized[$sanitizedCategory][$sanitizedKey] = is_string($value) ? $value : '';
                        break;
                    case 'js':
                        // For JS code, preserve content but ensure it's a string
                        $sanitized[$sanitizedCategory][$sanitizedKey] = is_string($value) ? $value : '';
                        break;
                    case 'settings':
                    case 'attributes':
                    case 'inner_blocks_settings':
                    case 'selected_partials':
                    case 'editor_selected_partials':
                        // For JSON data, validate it's valid JSON
                        if (is_string($value)) {
                            $decoded = json_decode($value, true);
                            $sanitized[$sanitizedCategory][$sanitizedKey] = (json_last_error() === JSON_ERROR_NONE) ? $value : '{}';
                        } else {
                            $sanitized[$sanitizedCategory][$sanitizedKey] = '{}';
                        }
                        break;
                    case 'is_global':
                        $sanitized[$sanitizedCategory][$sanitizedKey] = $value ? '1' : '0';
                        break;
                    case 'global_order':
                        $sanitized[$sanitizedCategory][$sanitizedKey] = (string) intval($value);
                        break;
                    default:
                        $sanitized[$sanitizedCategory][$sanitizedKey] = sanitize_textarea_field($value);
                }
            }
        }

        return $sanitized;
    }

    /**
     * Build proper meta key from category and key
     */
    private function buildMetaKey(string $category, string $key): ?string
    {
        $meta_key_map = [
            'blocks' => [
                'php' => MetaKeysConstants::BLOCK_PHP,
                'scss' => MetaKeysConstants::BLOCK_SCSS,
                'js' => MetaKeysConstants::BLOCK_JS,
                'settings' => MetaKeysConstants::BLOCK_SETTINGS,
                'attributes' => MetaKeysConstants::BLOCK_ATTRIBUTES,
                'inner_blocks_settings' => MetaKeysConstants::INNER_BLOCKS_SETTINGS,
            ],
            'symbols' => [
                'php' => MetaKeysConstants::SYMBOL_PHP,
            ],
            'scss_partials' => [
                'scss' => MetaKeysConstants::SCSS_PARTIAL_SCSS,
                'is_global' => MetaKeysConstants::SCSS_IS_GLOBAL,
                'global_order' => MetaKeysConstants::SCSS_GLOBAL_ORDER,
            ]
        ];

        return $meta_key_map[$category][$key] ?? null;
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
                if (class_exists('FanCoolo\Database\BlockSettingsRepository')) {
                    BlockSettingsRepository::delete($postId);
                }
            } catch (\Exception $e) {
                error_log('Warning: Could not delete block settings: ' . $e->getMessage());
            }

            try {
                if (class_exists('FanCoolo\Database\ScssPartialsSettingsRepository')) {
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