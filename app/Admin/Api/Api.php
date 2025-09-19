<?php

namespace Fanculo\Admin\Api;

use Fanculo\Admin\Api\PostsApiController;
use Fanculo\Admin\Api\TaxonomyApiController;
use Fanculo\Admin\Api\BlockCategoriesApiController;
use Fanculo\Admin\Api\FileGenerationApiController;
use Fanculo\Admin\Api\ScssCompilerApiController;
use Fanculo\Content\FunculoTypeTaxonomy;

class Api
{
    private $postsController;
    private $taxonomyController;
    private $blockCategoriesController;
    private $fileGenerationController;
    private $scssCompilerController;

    public function __construct()
    {
        $this->postsController = new PostsApiController();
        $this->taxonomyController = new TaxonomyApiController();
        $this->blockCategoriesController = new BlockCategoriesApiController();
        $this->fileGenerationController = new FileGenerationApiController();
        $this->scssCompilerController = new ScssCompilerApiController();

        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes()
    {
        // Posts routes
        register_rest_route('funculo/v1', '/posts', [
            [
                'methods' => 'GET',
                'callback' => [$this->postsController, 'getPosts'],
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
                'callback' => [$this->postsController, 'createPost'],
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
                'callback' => [$this->postsController, 'getPost'],
                'permission_callback' => [$this, 'checkPermissions'],
            ],
            [
                'methods' => 'PUT',
                'callback' => [$this->postsController, 'updatePost'],
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
                'callback' => [$this->postsController, 'deletePost'],
                'permission_callback' => [$this, 'checkDeletePermissions'],
            ]
        ]);

        // Taxonomy routes
        register_rest_route('funculo/v1', '/taxonomy-terms', [
            'methods' => 'GET',
            'callback' => [$this->taxonomyController, 'getTaxonomyTerms'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);

        // Block categories routes
        register_rest_route('funculo/v1', '/block-categories', [
            'methods' => 'GET',
            'callback' => [$this->blockCategoriesController, 'getBlockCategories'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);

        // File generation routes
        register_rest_route('funculo/v1', '/regenerate-files', [
            'methods' => 'POST',
            'callback' => [$this->fileGenerationController, 'regenerateFiles'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
        ]);

        // Force regenerate all files (manual button)
        register_rest_route('funculo/v1', '/force-regenerate-all', [
            'methods' => 'POST',
            'callback' => [$this->fileGenerationController, 'forceRegenerateAll'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
        ]);

        // SCSS compilation routes
        register_rest_route('funculo/v1', '/post/(?P<id>\d+)/scss', [
            [
                'methods' => 'GET',
                'callback' => [$this->scssCompilerController, 'getScssContent'],
                'permission_callback' => [$this, 'checkPermissions'],
            ],
            [
                'methods' => 'POST',
                'callback' => [$this->scssCompilerController, 'compileAndSaveScss'],
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
            'callback' => [$this->scssCompilerController, 'getScssPartials'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);

        register_rest_route('funculo/v1', '/scss-partial/(?P<id>\d+)/global-setting', [
            'methods' => 'POST',
            'callback' => [$this->scssCompilerController, 'updatePartialGlobalSetting'],
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

        // BATCH API ENDPOINTS - Phase 2.3

        // Batch fetch multiple posts by IDs
        register_rest_route('funculo/v1', '/posts/batch', [
            'methods' => 'POST',
            'callback' => [$this->postsController, 'getBatchPosts'],
            'permission_callback' => [$this, 'checkPermissions'],
            'args' => [
                'post_ids' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 50; // Limit to 50 posts
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
            'callback' => [$this->postsController, 'batchUpdatePosts'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'updates' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 20; // Limit to 20 updates
                    }
                ],
            ],
        ]);

        // Get post with all related data (partials, categories, etc.)
        register_rest_route('funculo/v1', '/post/(?P<id>\d+)/with-related', [
            'methods' => 'GET',
            'callback' => [$this->postsController, 'getPostWithRelated'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);

        // Batch SCSS compilation
        register_rest_route('funculo/v1', '/scss/compile-batch', [
            'methods' => 'POST',
            'callback' => [$this->scssCompilerController, 'batchCompileScss'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'compilations' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 10; // Limit to 10 compilations
                    }
                ],
            ],
        ]);

        // Bulk operations endpoint - execute multiple operations in single request
        register_rest_route('funculo/v1', '/operations/bulk', [
            'methods' => 'POST',
            'callback' => [$this->postsController, 'executeBulkOperations'],
            'permission_callback' => [$this, 'checkCreatePermissions'],
            'args' => [
                'operations' => [
                    'required' => true,
                    'type' => 'array',
                    'validate_callback' => function($param) {
                        return is_array($param) && !empty($param) && count($param) <= 15; // Limit to 15 operations
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
}