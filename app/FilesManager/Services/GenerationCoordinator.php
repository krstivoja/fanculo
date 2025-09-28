<?php

namespace Fanculo\FilesManager\Services;

use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Services\DevReloadManager;
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

        if ($post->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        // Guard: Skip if regeneration is not needed
        if ($this->shouldSkipRegeneration($postId, $post)) {
            return;
        }

        // Smart save: just regenerate (with logging to debug any issues)
        error_log("Fanculo: Starting file generation for post {$postId} ({$post->post_title})");
        $this->generateFilesForSinglePost($postId, $post);
        error_log("Fanculo: Completed file generation for post {$postId}");

        // Check if this post affects global files
        if ($this->globalRegenerator->detectGlobalImpact($postId, $post)) {
            $this->globalRegenerator->regenerateGlobalDependencies();
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

            // Record hot reload events based on content type
            error_log("Fanculo GenerationCoordinator: Processing content type '{$term->slug}' for post '{$post->post_name}' (ID: {$postId})");
            switch ($term->slug) {
                case 'block':
                    error_log("Fanculo GenerationCoordinator: Recording block_updated event");
                    DevReloadManager::recordBlockUpdated($post->post_name, $postId);
                    break;
                case 'symbol':
                    DevReloadManager::recordSymbolUpdated($post->post_name);
                    break;
                case 'scss-partial':
                    DevReloadManager::recordScssUpdated($post->post_name);
                    break;
                default:
                    DevReloadManager::recordEvent('content_updated', [
                        'type' => $term->slug,
                        'slug' => $post->post_name,
                        'post_id' => $postId,
                        'message' => "Content '{$post->post_name}' of type '{$term->slug}' updated"
                    ]);
                    break;
            }
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