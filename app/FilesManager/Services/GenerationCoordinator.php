<?php

namespace Fanculo\FilesManager\Services;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
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
        error_log("GenerationCoordinator: Processing post save for ID: $postId, type: {$post->post_type}");

        if ($post->post_type !== FunculoPostType::getPostType()) {
            error_log("GenerationCoordinator: Skipping - wrong post type: {$post->post_type}");
            return;
        }

        // Guard: Skip if regeneration is not needed
        if ($this->shouldSkipRegeneration($postId, $post)) {
            error_log("GenerationCoordinator: Skipping regeneration - no changes detected");
            return;
        }

        // Smart save: only regenerate what's needed
        error_log("GenerationCoordinator: Using smart save - generating files for single post");
        $this->generateFilesForSinglePost($postId, $post);

        // Check if this post affects global files
        if ($this->globalRegenerator->detectGlobalImpact($postId, $post)) {
            error_log("GenerationCoordinator: Post affects global files - regenerating global dependencies");
            $this->globalRegenerator->regenerateGlobalDependencies();
        } else {
            error_log("GenerationCoordinator: Post only affects itself - skipping global regeneration");
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

        error_log("GenerationCoordinator: Post renamed from '{$postBefore->post_name}' to '{$postAfter->post_name}' - triggering full regeneration");
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

        error_log("GenerationCoordinator: Post deleted (ID: $postId, slug: {$post->post_name}) - triggering full regeneration");
        $this->regenerateAllFiles();
    }

    /**
     * Regenerate all files (full regeneration)
     */
    public function regenerateAllFiles(): void
    {
        error_log("GenerationCoordinator: Starting full regeneration of all files");

        $this->directoryManager->cleanupAllFiles();

        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'publish',
            'numberposts' => -1
        ]);

        error_log("GenerationCoordinator: Found " . count($posts) . " posts to process");

        if (empty($posts)) {
            error_log("GenerationCoordinator: No posts found, skipping file generation");
            return;
        }

        $this->directoryManager->ensureBaseDirectoryExists();

        foreach ($posts as $post) {
            $this->generateFilesForSinglePost($post->ID, $post);
        }

        error_log("GenerationCoordinator: Full regeneration completed");
    }

    /**
     * Generate files for a single post
     */
    public function generateFilesForSinglePost(int $postId, WP_Post $post): void
    {
        $terms = wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy());
        if (empty($terms) || is_wp_error($terms)) {
            error_log("GenerationCoordinator: No terms found for post ID: $postId");
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