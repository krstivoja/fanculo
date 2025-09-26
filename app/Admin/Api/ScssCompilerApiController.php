<?php

namespace Fanculo\Admin\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Admin\Api\Services\BulkQueryService;
use Fanculo\Admin\Api\Services\UnifiedApiService;
use Fanculo\Admin\Api\Services\ApiResponseFormatter;
use Fanculo\Database\ScssPartialsSettingsRepository;

class ScssCompilerApiController
{
    private $bulkQueryService;
    private $unifiedApiService;
    private $responseFormatter;

    public function __construct()
    {
        $this->bulkQueryService = new BulkQueryService();
        $this->unifiedApiService = new UnifiedApiService();
        $this->responseFormatter = new ApiResponseFormatter();
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
            }

            return $this->responseFormatter->updated([
                'post_id' => $post_id,
            ], ['message' => 'SCSS compiled and saved successfully']);

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

        return $this->responseFormatter->success([
            'post_id' => $post_id,
            'scss_content' => $scss_content ?: '',
            'css_content' => $css_content ?: ''
        ]);
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

        return $this->responseFormatter->success([
            'post_id' => $post_id,
            'editor_scss_content' => $editor_scss_content ?: '',
            'editor_css_content' => $editor_css_content ?: ''
        ]);
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
            }

            return $this->responseFormatter->updated([
                'post_id' => $post_id,
            ], ['message' => 'Editor SCSS compiled and saved successfully']);

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
            // Use unified service for cached fetch
            $cacheKey = 'fanculo_scss_partials_api';
            $partials = $this->unifiedApiService->fetchWithCache(
                $cacheKey,
                function() {
                    return get_posts([
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
                },
                300 // 5 minutes cache
            );

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

            return $this->responseFormatter->success([
                'global_partials' => $global_partials,
                'available_partials' => $available_partials
            ]);

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

            return $this->responseFormatter->updated([
                'post_id' => $post_id,
                'is_global' => (bool) $is_global,
                'global_order' => $global_order
            ]);

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
        $compilations = $request->get_param('compilations');

        // Use unified service for batch operations
        return $this->unifiedApiService->executeBatchOperations(
            $compilations,
            function($compilation, $index) {
                // Validate compilation
                if (!isset($compilation['post_id'])) {
                    throw new \Exception('Post ID is required');
                }

                $postId = (int)$compilation['post_id'];
                $scssContent = $compilation['scss_content'] ?? null;
                $cssContent = $compilation['css_content'] ?? null;
                $editorScssContent = $compilation['editor_scss_content'] ?? null;
                $editorCssContent = $compilation['editor_css_content'] ?? null;

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

                return [
                    'post_id' => $postId,
                    'title' => get_the_title($postId),
                    'main_css' => $cssContent !== null,
                    'editor_css' => $editorCssContent !== null,
                ];
            },
            ['max_operations' => 10] // Original limit was 10
        );
    }
}