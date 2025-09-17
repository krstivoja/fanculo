<?php

namespace Fanculo\Admin\Api;

use Fanculo\Admin\Content\FunculoPostType;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use Fanculo\FilesManager\FilesManagerService;
use Fanculo\FilesManager\Services\DirectoryManager;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Admin\Api\Services\BulkQueryService;

class PostsApiController
{
    private $bulkQueryService;

    public function __construct()
    {
        $this->bulkQueryService = new BulkQueryService();
    }

    public function getPosts($request)
    {
        $startTime = microtime(true);

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

        // Build response with prefetched data - NO MORE INDIVIDUAL QUERIES
        $posts = [];
        foreach ($query->posts as $post) {
            $postTerms = $allTerms[$post->ID] ?? [];
            $postMeta = $allMeta[$post->ID] ?? [];

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
                'meta' => $this->bulkQueryService->formatPostMeta($postMeta, $postTerms),
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
            'meta' => $this->bulkQueryService->formatPostMeta($postMeta, $postTerms),
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
            update_post_meta($postId, MetaKeysConstants::BLOCK_SETTINGS, json_encode($defaultSettings));
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
            'meta' => $this->bulkQueryService->formatPostMeta($postMeta, $postTerms),
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
                        'php' => get_post_meta($postId, MetaKeysConstants::BLOCK_PHP, true),
                        'scss' => get_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, true),
                        'js' => get_post_meta($postId, MetaKeysConstants::BLOCK_JS, true),
                        'attributes' => get_post_meta($postId, MetaKeysConstants::BLOCK_ATTRIBUTES, true),
                        'settings' => get_post_meta($postId, MetaKeysConstants::BLOCK_SETTINGS, true),
                        'selected_partials' => get_post_meta($postId, MetaKeysConstants::BLOCK_SELECTED_PARTIALS, true),
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
                update_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, sanitize_textarea_field($blocks['scss']));
            }
            if (isset($blocks['js'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_JS, sanitize_textarea_field($blocks['js']));
            }
            if (isset($blocks['attributes'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_ATTRIBUTES, sanitize_textarea_field($blocks['attributes']));
            }
            if (isset($blocks['settings'])) {
                update_post_meta($postId, MetaKeysConstants::BLOCK_SETTINGS, sanitize_textarea_field($blocks['settings']));
            }
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
}