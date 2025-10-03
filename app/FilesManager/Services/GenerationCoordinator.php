<?php

namespace FanCoolo\FilesManager\Services;

use FanCoolo\Content\FunculoPostType;
use FanCoolo\Content\FunculoTypeTaxonomy;
use WP_Post;

class GenerationCoordinator
{
    private $contentTypeProcessor;
    private $globalRegenerator;
    private $directoryManager;

    public function __construct()
    {
        $this->contentTypeProcessor = new ContentTypeProcessor();
        $this->globalRegenerator = new GlobalRegenerator();
        $this->directoryManager = new DirectoryManager();
    }

    /**
     * Handle post save with smart regeneration logic and guards
     */
    public function handlePostSave(int $postId, WP_Post $post, bool $update): void
    {
        error_log("FanCoolo Debug: handlePostSave called for post ID: $postId, title: {$post->post_title}");

        if ($post->post_type !== FunculoPostType::getPostType()) {
            error_log("FanCoolo Debug: Skipping - wrong post type: {$post->post_type}");
            return;
        }

        // Check if this is an SCSS partial
        $terms = wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy());
        $isScssPartial = false;

        if (!empty($terms) && !is_wp_error($terms)) {
            foreach ($terms as $term) {
                if ($term->slug === FunculoTypeTaxonomy::getTermScssPartials()) {
                    $isScssPartial = true;
                    break;
                }
            }
        }

        // Skip file generation for SCSS partials - they're compiled in browser
        if ($isScssPartial) {
            error_log("FanCoolo Debug: Skipping file generation for SCSS partial (browser compilation)");
            // Don't generate files, but still handle global impact below
        } else {
            // Guard: Skip if regeneration is not needed
            if ($this->shouldSkipRegeneration($postId, $post)) {
                error_log("FanCoolo Debug: Skipping - regeneration not needed");
                return;
            }

            // Smart save: just regenerate
            error_log("FanCoolo Debug: Generating files for post ID: $postId");
            $this->generateFilesForSinglePost($postId, $post);
        }

        // Check if this post affects other posts (SCSS partials)
        if ($this->globalRegenerator->detectGlobalImpact($postId, $post)) {
            try {
                if ($isScssPartial) {
                    // Targeted regeneration: only blocks using this specific partial
                    $this->globalRegenerator->regenerateBlocksUsingPartial($postId);
                } else {
                    // Fallback to regenerating all global dependencies
                    $this->globalRegenerator->regenerateGlobalDependencies();
                }
            } catch (\Exception $e) {
                error_log("FanCoolo Error: Failed to regenerate dependent blocks - " . $e->getMessage());
                // Continue execution - don't block the save operation
            }
        }
    }

    /**
     * Handle post rename - triggers full regeneration
     */
    public function handlePostRename(int $postId, WP_Post $postAfter, WP_Post $postBefore): void
    {
        if ($postAfter->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        if ($postBefore->post_name === $postAfter->post_name) {
            return;
        }

        $this->regenerateAllFiles();
    }

    /**
     * Handle post deletion - triggers full regeneration
     */
    public function handlePostDeletion(int $postId): void
    {
        $post = get_post($postId);
        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        $this->regenerateAllFiles();
    }

    /**
     * Regenerate all files (full regeneration)
     */
    public function regenerateAllFiles(): void
    {

        $this->directoryManager->cleanupAllFiles();

        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'publish',
            'numberposts' => -1
        ]);


        if (empty($posts)) {
            return;
        }

        $this->directoryManager->ensureBaseDirectoryExists();

        foreach ($posts as $post) {
            // Skip SCSS partials - they don't need file generation
            // Their content is stored in database and compiled in browser
            $terms = wp_get_post_terms($post->ID, FunculoTypeTaxonomy::getTaxonomy());
            $isScssPartial = false;

            if (!empty($terms) && !is_wp_error($terms)) {
                foreach ($terms as $term) {
                    if ($term->slug === FunculoTypeTaxonomy::getTermScssPartials()) {
                        $isScssPartial = true;
                        break;
                    }
                }
            }

            if ($isScssPartial) {
                continue; // Skip SCSS partials
            }

            $this->generateFilesForSinglePost($post->ID, $post);
        }

    }

    /**
     * Clean up files for a single post before regenerating
     */
    public function cleanupFilesForSinglePost(int $postId, WP_Post $post): void
    {
        $terms = wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy());
        if (empty($terms) || is_wp_error($terms)) {
            return;
        }

        foreach ($terms as $term) {
            $outputPath = $this->contentTypeProcessor->getOutputPathForContentType($term->slug, $post);
            if ($outputPath && is_dir($outputPath)) {
                $this->directoryManager->deleteSpecificDirectory($outputPath);
            }
        }
    }

    /**
     * Generate files for a single post
     */
    public function generateFilesForSinglePost(int $postId, WP_Post $post): void
    {
        $terms = wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy());
        if (empty($terms) || is_wp_error($terms)) {
            return;
        }

        foreach ($terms as $term) {
            $this->contentTypeProcessor->processContentType($postId, $post, $term->slug);
        }
    }

    /**
     * Guard logic to determine if regeneration should be skipped
     */
    public function shouldSkipRegeneration(int $postId, WP_Post $post): bool
    {
        // For now, always allow regeneration
        // TODO: Implement guards based on:
        // - Last modification timestamps
        // - Content change detection
        // - Debounce rapid successive saves

        return false;
    }

    /**
     * Check if content has actually changed (guard against unnecessary regeneration)
     */
    private function hasContentChanged(int $postId, WP_Post $post): bool
    {
        // TODO: Implement change detection logic:
        // - Compare meta field hashes
        // - Check modification timestamps
        // - Track last regeneration time

        return true; // For now, assume content has changed
    }

    /**
     * Debounce rapid successive saves (protect against autosave spam)
     */
    private function shouldDebounce(int $postId): bool
    {
        // TODO: Implement debouncing logic:
        // - Track last save timestamp per post
        // - Skip if saved within last N seconds

        return false; // For now, don't debounce
    }
}