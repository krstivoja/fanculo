<?php

namespace Fanculo\FilesManager\Services;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\Database\ScssPartialsSettingsRepository;
use Fanculo\Database\BlockSettingsRepository;
use Fanculo\Database\PartialsUsageRepository;
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
     * Regenerate blocks affected by a specific partial (FAST - uses junction table)
     *
     * @param int $partial_id The partial post ID that was modified
     * @return int Number of blocks regenerated
     */
    public function regenerateBlocksUsingPartial(int $partial_id): int
    {
        // Fast O(1) lookup using indexed junction table
        $block_ids = PartialsUsageRepository::getBlocksUsingPartial($partial_id);

        if (empty($block_ids)) {
            return 0;
        }

        error_log(sprintf(
            'Fanculo: Regenerating %d blocks affected by partial #%d',
            count($block_ids),
            $partial_id
        ));

        // Get full post objects for regeneration
        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'publish',
            'post__in' => $block_ids,
            'numberposts' => -1
        ]);

        foreach ($posts as $post) {
            $this->contentTypeProcessor->processContentType(
                $post->ID,
                $post,
                FunculoTypeTaxonomy::getTermBlocks()
            );
        }

        return count($posts);
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