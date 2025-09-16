<?php

namespace Fanculo\Admin\Api;

use Fanculo\Admin\Api\PostsApiController;
use Fanculo\Admin\Api\TaxonomyApiController;
use Fanculo\Admin\Api\BlockCategoriesApiController;
use Fanculo\Admin\Api\FileGenerationApiController;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;

class Api
{
    private $postsController;
    private $taxonomyController;
    private $blockCategoriesController;
    private $fileGenerationController;

    public function __construct()
    {
        $this->postsController = new PostsApiController();
        $this->taxonomyController = new TaxonomyApiController();
        $this->blockCategoriesController = new BlockCategoriesApiController();
        $this->fileGenerationController = new FileGenerationApiController();

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