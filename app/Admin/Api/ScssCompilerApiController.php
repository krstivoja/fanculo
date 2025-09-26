<?php

namespace Fanculo\Admin\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Admin\Api\Services\BulkQueryService;
use Fanculo\Database\ScssPartialsSettingsRepository;

class ScssCompilerApiController
{
    private $bulkQueryService;

    public function __construct()
    {
        $this->bulkQueryService = new BulkQueryService();
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes()
    {
        // SCSS compilation routes
        register_rest_route('funculo/v1', '/post/(?P<id>\d+)/scss', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'getScssContent'],
                'permission_callback' => [$this, 'checkPermissions'],
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'compileAndSaveScss'],
                'permission_callback' => [$this, 'checkCreatePermissions'],
                'args' => [
                    'scss_content' => [
                        'required' => false,
                        'type' => 'string',
                    ],
                    'css_content' => [
                        'required' => false,
                        'type' => 'string',
                    ],
                ],
            ]
        ]);

        // Editor SCSS compilation routes
        register_rest_route('funculo/v1', '/post/(?P<id>\d+)/editor-scss', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'getEditorScssContent'],
                'permission_callback' => [$this, 'checkPermissions'],
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'compileAndSaveEditorScss'],
                'permission_callback' => [$this, 'checkCreatePermissions'],
                'args' => [
                    'editor_scss_content' => [
                        'required' => false,
                        'type' => 'string',
                    ],
                    'editor_css_content' => [
                        'required' => false,
                        'type' => 'string',
                    ],
                ],
            ]
        ]);

        // SCSS partials routes
        register_rest_route('funculo/v1', '/scss-partials', [
            'methods' => 'GET',
            'callback' => [$this, 'getScssPartials'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);

        register_rest_route('funculo/v1', '/scss-partial/(?P<id>\d+)/global-setting', [
            'methods' => 'POST',
            'callback' => [$this, 'updatePartialGlobalSetting'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'is_global' => [
                    'required' => true,
                    'type' => 'boolean',
                ],
                'global_order' => [
                    'required' => false,
                    'type' => 'integer',
                ],
            ],
        ]);

        // Batch SCSS compilation
        register_rest_route('funculo/v1', '/scss/compile-batch', [
            'methods' => 'POST',
            'callback' => [$this, 'batchCompileScss'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'compilations' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 10;
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

    /**
     * Compile SCSS content to CSS and save it as meta
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function compileAndSaveScss(WP_REST_Request $request)
    {
        $post_id = $request->get_param('id');
        $scss_content = $request->get_param('scss_content');
        $css_content = $request->get_param('css_content');

        if (!$post_id) {
            return new WP_Error('missing_post_id', 'Post ID is required', ['status' => 400]);
        }

        // Verify the post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        try {
            // Save SCSS content if provided
            if ($scss_content !== null) {
                update_post_meta($post_id, MetaKeysConstants::SCSS_CONTENT, $scss_content);
            }

            // Save compiled CSS content if provided
            if ($css_content !== null) {
                update_post_meta($post_id, MetaKeysConstants::CSS_CONTENT, $css_content);

                // Also save compilation timestamp
                update_post_meta($post_id, MetaKeysConstants::CSS_COMPILED_AT, current_time('timestamp'));
            }

            return new WP_REST_Response([
                'success' => true,
                'post_id' => $post_id,
                'message' => 'SCSS compiled and saved successfully',
                'compiled_at' => current_time('c')
            ], 200);

        } catch (\Exception $e) {
            return new WP_Error('compilation_error', $e->getMessage(), ['status' => 500]);
        }
    }

    /**
     * Get SCSS and CSS content for a post
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function getScssContent(WP_REST_Request $request)
    {
        $post_id = $request->get_param('id');

        if (!$post_id) {
            return new WP_Error('missing_post_id', 'Post ID is required', ['status' => 400]);
        }

        // Verify the post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        $scss_content = get_post_meta($post_id, MetaKeysConstants::SCSS_CONTENT, true);
        $css_content = get_post_meta($post_id, MetaKeysConstants::CSS_CONTENT, true);
        $compiled_at = get_post_meta($post_id, MetaKeysConstants::CSS_COMPILED_AT, true);

        return new WP_REST_Response([
            'post_id' => $post_id,
            'scss_content' => $scss_content ?: '',
            'css_content' => $css_content ?: '',
            'compiled_at' => $compiled_at ? gmdate('c', $compiled_at) : null
        ], 200);
    }

    /**
     * Get editor SCSS and CSS content for a post
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function getEditorScssContent(WP_REST_Request $request)
    {
        $post_id = $request->get_param('id');

        if (!$post_id) {
            return new WP_Error('missing_post_id', 'Post ID is required', ['status' => 400]);
        }

        // Verify the post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        $editor_scss_content = get_post_meta($post_id, MetaKeysConstants::BLOCK_EDITOR_SCSS, true);
        $editor_css_content = get_post_meta($post_id, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, true);
        $compiled_at = get_post_meta($post_id, MetaKeysConstants::CSS_COMPILED_AT, true);

        return new WP_REST_Response([
            'post_id' => $post_id,
            'editor_scss_content' => $editor_scss_content ?: '',
            'editor_css_content' => $editor_css_content ?: '',
            'compiled_at' => $compiled_at ? gmdate('c', $compiled_at) : null
        ], 200);
    }

    /**
     * Compile editor SCSS content to CSS and save it as meta
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function compileAndSaveEditorScss(WP_REST_Request $request)
    {
        $post_id = $request->get_param('id');
        $editor_scss_content = $request->get_param('editor_scss_content');
        $editor_css_content = $request->get_param('editor_css_content');

        if (!$post_id) {
            return new WP_Error('missing_post_id', 'Post ID is required', ['status' => 400]);
        }

        // Verify the post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        try {
            // Save editor SCSS content if provided
            if ($editor_scss_content !== null) {
                update_post_meta($post_id, MetaKeysConstants::BLOCK_EDITOR_SCSS, $editor_scss_content);
            }

            // Save compiled editor CSS content if provided
            if ($editor_css_content !== null) {
                update_post_meta($post_id, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, $editor_css_content);

                // Also save compilation timestamp
                update_post_meta($post_id, MetaKeysConstants::CSS_COMPILED_AT, current_time('timestamp'));
            }

            return new WP_REST_Response([
                'success' => true,
                'post_id' => $post_id,
                'message' => 'Editor SCSS compiled and saved successfully',
                'compiled_at' => current_time('c')
            ], 200);

        } catch (\Exception $e) {
            return new WP_Error('compilation_error', $e->getMessage(), ['status' => 500]);
        }
    }

    /**
     * Get all available SCSS partials
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function getScssPartials(WP_REST_Request $request)
    {
        try {
            // Get all SCSS partials posts with caching
            $cacheKey = 'fanculo_scss_partials_api';
            $partials = wp_cache_get($cacheKey, 'fanculo_api_data');

            if (false === $partials) {
                $partials = get_posts([
                    'post_type' => FunculoPostType::getPostType(),
                    'post_status' => 'publish',
                    'numberposts' => -1,
                    // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Cached query, acceptable performance
                    'tax_query' => [
                        [
                            'taxonomy' => FunculoTypeTaxonomy::getTaxonomy(),
                            'field' => 'slug',
                            'terms' => FunculoTypeTaxonomy::getTermScssPartials()
                        ]
                    ]
                ]);

                // Cache for 5 minutes
                wp_cache_set($cacheKey, $partials, 'fanculo_api_data', 300);
            }

            $formatted_partials = [];
            $global_partials = [];
            $available_partials = [];

            if (!empty($partials)) {
                // BULK OPERATION: Fetch settings from database - eliminates N+1 queries
                $postIds = wp_list_pluck($partials, 'ID');
                $scssSettings = ScssPartialsSettingsRepository::getBulk($postIds);

                foreach ($partials as $partial) {
                    $settings = $scssSettings[$partial->ID] ?? null;
                    $is_global = $settings ? $settings['is_global'] : false;
                    $global_order = $settings ? $settings['global_order'] : 999;

                    $partial_data = [
                        'id' => $partial->ID,
                        'title' => $partial->post_title,
                        'slug' => $partial->post_name,
                        'is_global' => $is_global,
                        'global_order' => $global_order
                    ];

                    // Check if is_global is true
                    if ($is_global) {
                        $global_partials[] = $partial_data;
                    } else {
                        $available_partials[] = $partial_data;
                    }
                }
            }

            // Sort global partials by order
            usort($global_partials, function($a, $b) {
                return $a['global_order'] - $b['global_order'];
            });

            // Sort available partials by title
            usort($available_partials, function($a, $b) {
                return strcmp($a['title'], $b['title']);
            });

            return new WP_REST_Response([
                'global_partials' => $global_partials,
                'available_partials' => $available_partials
            ], 200);

        } catch (\Exception $e) {
            return new WP_Error('fetch_partials_error', $e->getMessage(), ['status' => 500]);
        }
    }

    /**
     * Update global setting for an SCSS partial
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function updatePartialGlobalSetting(WP_REST_Request $request)
    {
        $post_id = $request->get_param('id');
        $is_global = $request->get_param('is_global');
        $global_order = $request->get_param('global_order');

        if (!$post_id) {
            return new WP_Error('missing_post_id', 'Post ID is required', ['status' => 400]);
        }

        // Verify the post exists and is an SCSS partial
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        try {
            // Update global settings in database table
            $settings = [
                'is_global' => (bool) $is_global
            ];

            // Update global order if provided
            if ($global_order !== null) {
                $settings['global_order'] = (int) $global_order;
            }

            // Save to database
            ScssPartialsSettingsRepository::save($post_id, $settings);

            return new WP_REST_Response([
                'success' => true,
                'post_id' => $post_id,
                'is_global' => (bool) $is_global,
                'global_order' => $global_order
            ], 200);

        } catch (\Exception $e) {
            return new WP_Error('update_global_setting_error', $e->getMessage(), ['status' => 500]);
        }
    }

    // ===========================================
    // BATCH API ENDPOINTS - Phase 2.3
    // ===========================================

    /**
     * Batch compile multiple SCSS files in a single request
     * Reduces multiple individual compilation requests
     */
    public function batchCompileScss(WP_REST_Request $request)
    {
        $startTime = microtime(true);
        $compilations = $request->get_param('compilations');
        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($compilations),
        ];

        foreach ($compilations as $index => $compilation) {
            if (!isset($compilation['post_id'])) {
                $results['failed'][] = [
                    'index' => $index,
                    'post_id' => $compilation['post_id'] ?? 'unknown',
                    'error' => 'Post ID is required',
                ];
                continue;
            }

            $postId = (int)$compilation['post_id'];
            $scssContent = $compilation['scss_content'] ?? null;
            $cssContent = $compilation['css_content'] ?? null;
            $editorScssContent = $compilation['editor_scss_content'] ?? null;
            $editorCssContent = $compilation['editor_css_content'] ?? null;

            try {
                // Verify the post exists
                $post = get_post($postId);
                if (!$post) {
                    throw new \Exception('Post not found');
                }

                // Save main SCSS content if provided
                if ($scssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::SCSS_CONTENT, $scssContent);
                }

                // Save main CSS content if provided
                if ($cssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::CSS_CONTENT, $cssContent);
                }

                // Save editor SCSS content if provided
                if ($editorScssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, $editorScssContent);
                }

                // Save editor CSS content if provided
                if ($editorCssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, $editorCssContent);
                }

                // Update compilation timestamp if any CSS was compiled
                if ($cssContent !== null || $editorCssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::CSS_COMPILED_AT, current_time('mysql'));
                }

                $results['successful'][] = [
                    'index' => $index,
                    'post_id' => $postId,
                    'title' => get_the_title($postId),
                    'compiled_at' => current_time('mysql'),
                    'main_css' => $cssContent !== null,
                    'editor_css' => $editorCssContent !== null,
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
        $this->bulkQueryService->logPerformance('batchCompileScss', $results['total'], $startTime);

        $statusCode = empty($results['failed']) ? 200 : 207; // 207 Multi-Status for partial success

        return new WP_REST_Response($results, $statusCode);
    }
}