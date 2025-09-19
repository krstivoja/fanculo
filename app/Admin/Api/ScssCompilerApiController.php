<?php

namespace Fanculo\Admin\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Admin\Api\Services\BulkQueryService;

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
                // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Cached query, acceptable performance
                $partials = get_posts([
                    'post_type' => FunculoPostType::getPostType(),
                    'post_status' => 'publish',
                    'numberposts' => -1,
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
                // BULK OPERATION: Fetch all meta at once - eliminates N+1 queries
                $postIds = wp_list_pluck($partials, 'ID');
                $metaKeys = [MetaKeysConstants::SCSS_IS_GLOBAL, MetaKeysConstants::SCSS_GLOBAL_ORDER];
                $allMeta = $this->bulkQueryService->getBulkPostMeta($postIds, $metaKeys);

                foreach ($partials as $partial) {
                    $postMeta = $allMeta[$partial->ID] ?? [];
                    $is_global = $postMeta[MetaKeysConstants::SCSS_IS_GLOBAL] ?? '';
                    $global_order = $postMeta[MetaKeysConstants::SCSS_GLOBAL_ORDER] ?? '';

                    $partial_data = [
                        'id' => $partial->ID,
                        'title' => $partial->post_title,
                        'slug' => $partial->post_name,
                        'is_global' => (bool) $is_global,
                        'global_order' => $global_order ? (int) $global_order : 999
                    ];


                    // Check if is_global is explicitly set to '1' (string) or 1 (int) or true (bool)
                    if ($is_global === '1' || $is_global === 1 || $is_global === true) {
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
            // Update global setting
            update_post_meta($post_id, MetaKeysConstants::SCSS_IS_GLOBAL, $is_global ? 1 : 0);

            // Update global order if provided
            if ($global_order !== null) {
                update_post_meta($post_id, MetaKeysConstants::SCSS_GLOBAL_ORDER, (int) $global_order);
            }

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
            if (!isset($compilation['post_id']) || !isset($compilation['scss_content'])) {
                $results['failed'][] = [
                    'index' => $index,
                    'post_id' => $compilation['post_id'] ?? 'unknown',
                    'error' => 'Post ID and SCSS content are required',
                ];
                continue;
            }

            $postId = (int)$compilation['post_id'];
            $scssContent = $compilation['scss_content'];
            $cssContent = $compilation['css_content'] ?? null;

            try {
                // Verify the post exists
                $post = get_post($postId);
                if (!$post) {
                    throw new \Exception('Post not found');
                }

                // Save SCSS content
                update_post_meta($postId, MetaKeysConstants::SCSS_CONTENT, $scssContent);

                // Save CSS content if provided
                if ($cssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::CSS_CONTENT, $cssContent);
                    update_post_meta($postId, MetaKeysConstants::CSS_COMPILED_AT, current_time('mysql'));
                }

                $results['successful'][] = [
                    'index' => $index,
                    'post_id' => $postId,
                    'title' => get_the_title($postId),
                    'compiled_at' => current_time('mysql'),
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