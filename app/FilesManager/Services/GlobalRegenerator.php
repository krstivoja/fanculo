<?php

namespace Fanculo\FilesManager\Services;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Database\ScssPartialsSettingsRepository;
use Fanculo\Database\BlockSettingsRepository;
use WP_Post;

class GlobalRegenerator
{
    private $contentTypeProcessor;

    public function __construct()
    {
        $this->contentTypeProcessor = new ContentTypeProcessor();
    }

    /**
     * Detect if a post affects other files that would require regenerating dependent posts
     * Returns true for ANY SCSS partial (global or non-global) that has blocks using it
     */
    public function detectGlobalImpact(int $postId, WP_Post $post): bool
    {
        $terms = wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy());

        if (empty($terms) || is_wp_error($terms)) {
            return false;
        }

        foreach ($terms as $term) {
            if ($term->slug === FunculoTypeTaxonomy::getTermScssPartials()) {
                // Any SCSS partial change affects blocks that use it
                return true;
            }
        }

        return false; // Only affects this post's files
    }

    /**
     * Regenerate only files affected by global dependencies
     */
    public function regenerateGlobalDependencies(): void
    {

        // Get all posts that might need their files updated due to global changes
        $affectedPosts = $this->findPostsUsingGlobalPartials();

        if (empty($affectedPosts)) {
            return;
        }


        foreach ($affectedPosts as $post) {
            $this->contentTypeProcessor->processContentType($post->ID, $post, FunculoTypeTaxonomy::getTermBlocks());
        }

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
        $settings = BlockSettingsRepository::get($postId);
        $selectedPartials = $settings ? $settings['selected_partials'] : [];

        if (empty($selectedPartials)) {
            return false;
        }

        // If the post has selected partials, check if any of them are global
        foreach ($selectedPartials as $partialId) {
            if ($this->isPartialGlobal($partialId)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a partial is marked as global
     */
    public function isPartialGlobal(int $partialId): bool
    {
        $settings = ScssPartialsSettingsRepository::get($partialId);
        return $settings ? $settings['is_global'] : false;
    }

    /**
     * Get all global SCSS partials
     */
    public function getGlobalPartials(): array
    {
        $cacheKey = 'fanculo_global_partials';
        $partials = wp_cache_get($cacheKey, 'fanculo_global_data');

        if (false === $partials) {
            // Get global partials from database
            $globalSettings = ScssPartialsSettingsRepository::getGlobalPartials();
            $partialIds = array_column($globalSettings, 'post_id');

            if (empty($partialIds)) {
                $partials = [];
            } else {
                // Get the actual posts for these IDs
                $partials = get_posts([
                    'post_type' => FunculoPostType::getPostType(),
                    'post_status' => 'publish',
                    'post__in' => $partialIds,
                    'numberposts' => -1,
                    'orderby' => 'post__in'
                ]);
            }

            // Cache for 10 minutes
            wp_cache_set($cacheKey, $partials, 'fanculo_global_data', 600);
        }

        return $partials;
    }

    /**
     * Find posts that depend on a specific global partial
     */
    public function findPostsDependingOnPartial(int $partialId): array
    {
        $cacheKey = 'fanculo_partial_deps_' . $partialId;
        $posts = wp_cache_get($cacheKey, 'fanculo_dependencies');

        if (false === $posts) {
            // Get blocks that use this partial from database
            $blockSettings = BlockSettingsRepository::getBlocksUsingPartial($partialId);
            $postIds = array_column($blockSettings, 'post_id');

            if (empty($postIds)) {
                $posts = [];
            } else {
                $posts = get_posts([
                    'post_type' => FunculoPostType::getPostType(),
                    'post_status' => 'publish',
                    'post__in' => $postIds,
                    'numberposts' => -1
                ]);
            }

            // Cache for 5 minutes since dependencies can change
            wp_cache_set($cacheKey, $posts, 'fanculo_dependencies', 300);
        }

        return $posts;
    }

    /**
     * Regenerate blocks that use a specific SCSS partial
     * More efficient than regenerating all blocks - only affects blocks using this partial
     */
    public function regenerateBlocksUsingPartial(int $partialId): void
    {
        error_log("Fanculo Debug: Starting regeneration for blocks using partial ID: $partialId");

        // Find all blocks that use this partial
        $affectedPosts = $this->findPostsDependingOnPartial($partialId);

        if (empty($affectedPosts)) {
            error_log("Fanculo Debug: No blocks found using partial ID: $partialId");
            return;
        }

        error_log("Fanculo Debug: Found " . count($affectedPosts) . " blocks using partial ID: $partialId");

        // Regenerate each affected block
        foreach ($affectedPosts as $post) {
            try {
                error_log("Fanculo Debug: Regenerating block ID: {$post->ID} (title: {$post->post_title})");
                $this->contentTypeProcessor->processContentType($post->ID, $post, FunculoTypeTaxonomy::getTermBlocks());
            } catch (\Exception $e) {
                error_log("Fanculo Error: Failed to regenerate block ID: {$post->ID} - " . $e->getMessage());
            }
        }

        error_log("Fanculo Debug: Completed regeneration for blocks using partial ID: $partialId");
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