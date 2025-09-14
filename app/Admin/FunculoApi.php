<?php

namespace Fanculo\Admin;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;

class FunculoApi
{
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes()
    {
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

        register_rest_route('funculo/v1', '/taxonomy-terms', [
            'methods' => 'GET',
            'callback' => [$this, 'getTaxonomyTerms'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);

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
            ]
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

    public function getPosts($request)
    {
        $args = [
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'posts_per_page' => $request->get_param('per_page'),
            'paged' => $request->get_param('page'),
            'meta_query' => [],
        ];

        // Add search functionality
        $search = $request->get_param('search');
        if (!empty($search)) {
            $args['s'] = $search;
        }

        // Add taxonomy filter
        $taxonomyFilter = $request->get_param('taxonomy_filter');
        if (!empty($taxonomyFilter)) {
            $args['tax_query'] = [
                [
                    'taxonomy' => FunculoTypeTaxonomy::getTaxonomy(),
                    'field' => 'slug',
                    'terms' => $taxonomyFilter,
                ],
            ];
        }

        $query = new \WP_Query($args);
        $posts = [];

        foreach ($query->posts as $post) {
            $terms = wp_get_post_terms($post->ID, FunculoTypeTaxonomy::getTaxonomy());
            $termData = [];

            foreach ($terms as $term) {
                $termData[] = [
                    'id' => $term->term_id,
                    'slug' => $term->slug,
                    'name' => $term->name,
                ];
            }

            $posts[] = [
                'id' => $post->ID,
                'title' => get_the_title($post->ID),
                'slug' => $post->post_name,
                'status' => $post->post_status,
                'date' => $post->post_date,
                'modified' => $post->post_modified,
                'excerpt' => wp_trim_words($post->post_content, 20),
                'terms' => $termData,
                'edit_url' => get_edit_post_link($post->ID),
                'meta' => $this->getPostMeta($post->ID, $termData),
            ];
        }

        return new \WP_REST_Response([
            'posts' => $posts,
            'total' => $query->found_posts,
            'total_pages' => $query->max_num_pages,
            'current_page' => $request->get_param('page'),
        ], 200);
    }

    public function getTaxonomyTerms($request)
    {
        $terms = get_terms([
            'taxonomy' => FunculoTypeTaxonomy::getTaxonomy(),
            'hide_empty' => false,
        ]);

        $termData = [];
        foreach ($terms as $term) {
            $termData[] = [
                'id' => $term->term_id,
                'slug' => $term->slug,
                'name' => $term->name,
                'description' => $term->description,
                'count' => $term->count,
            ];
        }

        return new \WP_REST_Response([
            'terms' => $termData,
        ], 200);
    }

    public function getPost($request)
    {
        $postId = $request->get_param('id');
        $post = get_post($postId);

        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return new \WP_Error('post_not_found', 'Post not found', ['status' => 404]);
        }

        $terms = wp_get_post_terms($post->ID, FunculoTypeTaxonomy::getTaxonomy());
        $termData = [];

        foreach ($terms as $term) {
            $termData[] = [
                'id' => $term->term_id,
                'slug' => $term->slug,
                'name' => $term->name,
            ];
        }

        return new \WP_REST_Response([
            'id' => $post->ID,
            'title' => get_the_title($post->ID),
            'content' => $post->post_content,
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'date' => $post->post_date,
            'modified' => $post->post_modified,
            'terms' => $termData,
            'edit_url' => get_edit_post_link($post->ID),
            'meta' => $this->getPostMeta($post->ID, $termData),
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

        // Get the created post data
        $post = get_post($postId);
        $terms = wp_get_post_terms($post->ID, FunculoTypeTaxonomy::getTaxonomy());
        $termData = [];

        foreach ($terms as $term) {
            $termData[] = [
                'id' => $term->term_id,
                'slug' => $term->slug,
                'name' => $term->name,
            ];
        }

        return new \WP_REST_Response([
            'id' => $post->ID,
            'title' => get_the_title($post->ID),
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'date' => $post->post_date,
            'modified' => $post->post_modified,
            'excerpt' => wp_trim_words($post->post_content, 20),
            'terms' => $termData,
            'edit_url' => get_edit_post_link($post->ID),
            'meta' => $this->getPostMeta($post->ID, $termData),
        ], 201);
    }

    private function getPostMeta($postId, $terms)
    {
        $meta = [];

        foreach ($terms as $term) {
            switch ($term['slug']) {
                case FunculoTypeTaxonomy::getTermBlocks():
                    $meta['blocks'] = [
                        'php' => get_post_meta($postId, '_funculo_block_php', true),
                        'scss' => get_post_meta($postId, '_funculo_block_scss', true),
                        'js' => get_post_meta($postId, '_funculo_block_js', true),
                        'attributes' => get_post_meta($postId, '_funculo_block_attributes', true),
                        'settings' => get_post_meta($postId, '_funculo_block_settings', true),
                    ];
                    break;

                case FunculoTypeTaxonomy::getTermSymbols():
                    $meta['symbols'] = [
                        'php' => get_post_meta($postId, '_funculo_symbol_php', true),
                    ];
                    break;

                case FunculoTypeTaxonomy::getTermScssPartials():
                    $meta['scss_partials'] = [
                        'scss' => get_post_meta($postId, '_funculo_scss_partial', true),
                    ];
                    break;
            }
        }

        return $meta;
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

        // Return updated post data
        return $this->getPost($request);
    }

    private function updatePostMeta($postId, $metaData)
    {
        // Update blocks meta
        if (isset($metaData['blocks'])) {
            $blocks = $metaData['blocks'];
            if (isset($blocks['php'])) {
                update_post_meta($postId, '_funculo_block_php', wp_unslash($blocks['php']));
            }
            if (isset($blocks['scss'])) {
                update_post_meta($postId, '_funculo_block_scss', sanitize_textarea_field($blocks['scss']));
            }
            if (isset($blocks['js'])) {
                update_post_meta($postId, '_funculo_block_js', sanitize_textarea_field($blocks['js']));
            }
            if (isset($blocks['attributes'])) {
                update_post_meta($postId, '_funculo_block_attributes', sanitize_textarea_field($blocks['attributes']));
            }
            if (isset($blocks['settings'])) {
                update_post_meta($postId, '_funculo_block_settings', sanitize_textarea_field($blocks['settings']));
            }
        }

        // Update symbols meta
        if (isset($metaData['symbols'])) {
            $symbols = $metaData['symbols'];
            if (isset($symbols['php'])) {
                update_post_meta($postId, '_funculo_symbol_php', wp_unslash($symbols['php']));
            }
        }

        // Update SCSS partials meta
        if (isset($metaData['scss_partials'])) {
            $scssPartials = $metaData['scss_partials'];
            if (isset($scssPartials['scss'])) {
                update_post_meta($postId, '_funculo_scss_partial', sanitize_textarea_field($scssPartials['scss']));
            }
        }
    }
}