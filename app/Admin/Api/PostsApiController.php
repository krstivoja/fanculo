<?php

namespace Fanculo\Admin\Api;

use Fanculo\Admin\Content\FunculoPostType;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use Fanculo\FilesManager\FilesManagerService;

class PostsApiController
{
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

        // Set default category for blocks
        if ($taxonomyTerm === 'blocks') {
            $defaultSettings = [
                'description' => '',
                'category' => 'text', // First category from BlockCategoriesApiController
                'icon' => 'search'
            ];
            update_post_meta($postId, '_funculo_block_settings', json_encode($defaultSettings));
        }

        // Get the created post data and trigger file generation
        $post = get_post($postId);
        if ($post) {
            $filesManagerService = new FilesManagerService();
            $filesManagerService->generateFilesOnPostSave($postId, $post, false);
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
                        'scss' => get_post_meta($postId, '_funculo_scss_partial_scss', true),
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
                update_post_meta($postId, '_funculo_scss_partial_scss', sanitize_textarea_field($scssPartials['scss']));
            }
        }
    }
}