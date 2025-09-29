<?php

namespace Fanculo\Admin\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Admin\Api\Controllers\BaseApiController;
use Fanculo\Database\ScssPartialsSettingsRepository;

class ScssCompilerApiController extends BaseApiController
{

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
            $startTime = microtime(true);

            // Step 1: WP_Query for SCSS partial posts
            $args = [
                'post_type' => FunculoPostType::getPostType(),
                'post_status' => 'publish',
                'posts_per_page' => -1,
                // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Cached operation, acceptable performance
                'tax_query' => [
                    [
                        'taxonomy' => FunculoTypeTaxonomy::getTaxonomy(),
                        'field' => 'slug',
                        'terms' => FunculoTypeTaxonomy::getTermScssPartials()
                    ]
                ]
            ];

            $query = new \WP_Query($args);

            if (empty($query->posts)) {
                return $this->responseFormatter->success([
                    'global_partials' => [],
                    'available_partials' => []
                ]);
            }

            // Extract post IDs for bulk operations
            $postIds = wp_list_pluck($query->posts, 'ID');

            // Execute standardized bulk pipeline (Steps 2-6)
            $pipelineResult = $this->standardBulkPipeline->executeBulkPipeline($postIds, [
                'skipBlockSettings' => true, // We only need SCSS settings
                'skipBlockAttributes' => true,
            ]);

            // Build response using pipeline data
            $global_partials = [];
            $available_partials = [];

            foreach ($query->posts as $post) {
                $scssSettings = $pipelineResult->scssSettings[$post->ID] ?? null;
                $is_global = $scssSettings ? $scssSettings['is_global'] : false;
                $global_order = $scssSettings ? $scssSettings['global_order'] : 999;

                $partial_data = [
                    'id' => $post->ID,
                    'title' => $post->post_title,
                    'slug' => $post->post_name,
                    'is_global' => $is_global,
                    'global_order' => $global_order
                ];

                // Categorize by global status
                if ($is_global) {
                    $global_partials[] = $partial_data;
                } else {
                    $available_partials[] = $partial_data;
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

            // Log performance
            $this->bulkQueryService->logPerformance('getScssPartials', count($query->posts), $startTime);

            $performanceData = [
                'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
                'total_partials' => count($query->posts),
                'global_count' => count($global_partials),
                'available_count' => count($available_partials),
            ];

            return $this->responseFormatter->success([
                'global_partials' => $global_partials,
                'available_partials' => $available_partials
            ], ['performance' => $performanceData]);

        } catch (\Exception $e) {
            return $this->responseFormatter->serverError('Failed to fetch SCSS partials: ' . $e->getMessage());
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
        $startTime = microtime(true);
        $compilations = $request->get_param('compilations');

        if (empty($compilations) || !is_array($compilations)) {
            return $this->responseFormatter->validationError(['compilations' => 'Compilations array is required']);
        }

        if (count($compilations) > 10) {
            return $this->responseFormatter->validationError(['compilations' => 'Maximum 10 compilations allowed per batch']);
        }

        // Extract and validate post IDs
        $postIds = [];
        foreach ($compilations as $compilation) {
            if (isset($compilation['post_id'])) {
                $postIds[] = absint($compilation['post_id']);
            }
        }

        if (empty($postIds)) {
            return $this->responseFormatter->validationError(['compilations' => 'At least one valid post ID is required']);
        }

        // Get posts using WP_Query (Step 1)
        $args = [
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'post__in' => $postIds,
            'posts_per_page' => count($postIds),
        ];

        $query = new \WP_Query($args);

        // Create a map of existing posts for quick lookup
        $existingPosts = [];
        foreach ($query->posts as $post) {
            $existingPosts[$post->ID] = $post;
        }

        $results = [
            'successful' => [],
            'failed' => [],
            'total' => count($compilations),
        ];

        // Process each compilation
        foreach ($compilations as $index => $compilation) {
            try {
                if (!isset($compilation['post_id'])) {
                    throw new \Exception('Post ID is required');
                }

                $postId = absint($compilation['post_id']);
                if (!isset($existingPosts[$postId])) {
                    throw new \Exception('Post not found');
                }

                $scssContent = $compilation['scss_content'] ?? null;
                $cssContent = $compilation['css_content'] ?? null;
                $editorScssContent = $compilation['editor_scss_content'] ?? null;
                $editorCssContent = $compilation['editor_css_content'] ?? null;

                // Save main SCSS content if provided
                if ($scssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::SCSS_CONTENT, sanitize_textarea_field($scssContent));
                }

                // Save main CSS content if provided
                if ($cssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::CSS_CONTENT, sanitize_textarea_field($cssContent));
                }

                // Save editor SCSS content if provided
                if ($editorScssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, sanitize_textarea_field($editorScssContent));
                }

                // Save editor CSS content if provided
                if ($editorCssContent !== null) {
                    update_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, sanitize_textarea_field($editorCssContent));
                }

                $results['successful'][] = [
                    'index' => $index,
                    'post_id' => $postId,
                    'title' => get_the_title($postId),
                    'main_css_updated' => $cssContent !== null,
                    'editor_css_updated' => $editorCssContent !== null,
                ];

            } catch (\Exception $e) {
                $results['failed'][] = [
                    'index' => $index,
                    'post_id' => $compilation['post_id'] ?? 'unknown',
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Log performance
        $this->bulkQueryService->logPerformance('batchCompileScss', $results['total'], $startTime);

        $performanceData = [
            'duration_ms' => round((microtime(true) - $startTime) * 1000, 2),
            'successful_count' => count($results['successful']),
            'failed_count' => count($results['failed']),
        ];

        return $this->responseFormatter->batch($results, $performanceData);
    }
}