<?php

namespace Fanculo\FilesManager\Services;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class GlobalRegenerator
{
    private $contentTypeProcessor;

    public function __construct()
    {
        $this->contentTypeProcessor = new ContentTypeProcessor();
    }

    /**
     * Detect if a post affects global files that would require regenerating other posts
     */
    public function detectGlobalImpact(int $postId, WP_Post $post): bool
    {
        $terms = wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy());

        if (empty($terms) || is_wp_error($terms)) {
            return false;
        }

        foreach ($terms as $term) {
            if ($term->slug === FunculoTypeTaxonomy::getTermScssPartials()) {
                // Check if this is a global SCSS partial
                $isGlobal = get_post_meta($postId, MetaKeysConstants::SCSS_IS_GLOBAL, true);
                if ($isGlobal === '1' || $isGlobal === 1 || $isGlobal === true) {
                    error_log("GlobalRegenerator: Post $postId is a global SCSS partial - affects other posts");
                    return true; // This affects all blocks that use global partials
                }
            }
        }

        error_log("GlobalRegenerator: Post $postId only affects its own files");
        return false; // Only affects this post's files
    }

    /**
     * Regenerate only files affected by global dependencies
     */
    public function regenerateGlobalDependencies(): void
    {
        error_log("GlobalRegenerator: Regenerating global files and dependencies");

        // Get all posts that might need their files updated due to global changes
        $affectedPosts = $this->findPostsUsingGlobalPartials();

        if (empty($affectedPosts)) {
            error_log("GlobalRegenerator: No posts affected by global changes");
            return;
        }

        error_log("GlobalRegenerator: Found " . count($affectedPosts) . " posts affected by global changes");

        foreach ($affectedPosts as $post) {
            error_log("GlobalRegenerator: Regenerating post '{$post->post_name}' due to global changes");
            $this->contentTypeProcessor->processContentType($post->ID, $post, FunculoTypeTaxonomy::getTermBlocks());
        }

        error_log("GlobalRegenerator: Global dependencies regeneration completed");
    }

    /**
     * Find all posts that use global SCSS partials
     */
    public function findPostsUsingGlobalPartials(): array
    {
        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'publish',
            'numberposts' => -1
        ]);

        $affectedPosts = [];

        foreach ($posts as $post) {
            $terms = wp_get_post_terms($post->ID, FunculoTypeTaxonomy::getTaxonomy());

            foreach ($terms as $term) {
                if ($term->slug === FunculoTypeTaxonomy::getTermBlocks()) {
                    // Check if this block uses any global partials
                    if ($this->postUsesGlobalPartials($post->ID)) {
                        $affectedPosts[] = $post;
                        break; // Found one, move to next post
                    }
                }
            }
        }

        return $affectedPosts;
    }

    /**
     * Check if a specific post uses global SCSS partials
     */
    public function postUsesGlobalPartials(int $postId): bool
    {
        $selectedPartials = get_post_meta($postId, MetaKeysConstants::BLOCK_SELECTED_PARTIALS, true);

        if (empty($selectedPartials)) {
            return false;
        }

        // If the post has selected partials, check if any of them are global
        if (is_array($selectedPartials)) {
            foreach ($selectedPartials as $partialId) {
                if ($this->isPartialGlobal($partialId)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if a partial is marked as global
     */
    public function isPartialGlobal(int $partialId): bool
    {
        $isGlobal = get_post_meta($partialId, MetaKeysConstants::SCSS_IS_GLOBAL, true);
        return $isGlobal === '1' || $isGlobal === 1 || $isGlobal === true;
    }

    /**
     * Get all global SCSS partials
     */
    public function getGlobalPartials(): array
    {
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
            ],
            'meta_query' => [
                [
                    'key' => MetaKeysConstants::SCSS_IS_GLOBAL,
                    'value' => ['1', 1, true],
                    'compare' => 'IN'
                ]
            ]
        ]);

        return $partials;
    }

    /**
     * Find posts that depend on a specific global partial
     */
    public function findPostsDependingOnPartial(int $partialId): array
    {
        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'publish',
            'numberposts' => -1,
            'meta_query' => [
                [
                    'key' => MetaKeysConstants::BLOCK_SELECTED_PARTIALS,
                    'value' => serialize(strval($partialId)),
                    'compare' => 'LIKE'
                ]
            ]
        ]);

        return $posts;
    }

    /**
     * Get global impact statistics
     */
    public function getGlobalImpactStats(): array
    {
        $globalPartials = $this->getGlobalPartials();
        $affectedPosts = $this->findPostsUsingGlobalPartials();

        return [
            'global_partials_count' => count($globalPartials),
            'affected_posts_count' => count($affectedPosts),
            'global_partials' => array_map(function($partial) {
                return [
                    'id' => $partial->ID,
                    'title' => $partial->post_title,
                    'slug' => $partial->post_name
                ];
            }, $globalPartials),
            'affected_posts' => array_map(function($post) {
                return [
                    'id' => $post->ID,
                    'title' => $post->post_title,
                    'slug' => $post->post_name
                ];
            }, $affectedPosts)
        ];
    }
}