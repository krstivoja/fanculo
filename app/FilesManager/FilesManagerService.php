<?php

namespace Fanculo\FilesManager;

use Fanculo\FilesManager\Services\DirectoryManager;
use Fanculo\FilesManager\Services\FileWriter;
use Fanculo\FilesManager\Mappers\GenerationMapper;
use Fanculo\Admin\Content\FunculoPostType;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class FilesManagerService
{
    private $directoryManager;
    private $fileWriter;
    private $generationMapper;

    public function __construct()
    {
        $this->directoryManager = new DirectoryManager();
        $this->fileWriter = new FileWriter();
        $this->generationMapper = new GenerationMapper();
    }

    public function generateFilesOnPostSave(int $postId, WP_Post $post, bool $update): void
    {
        error_log("FilesManagerService: Processing post save for ID: $postId, type: {$post->post_type}");

        if ($post->post_type !== FunculoPostType::getPostType()) {
            error_log("FilesManagerService: Skipping - wrong post type: {$post->post_type}");
            return;
        }

        // Smart save: only regenerate what's needed
        error_log("FilesManagerService: Using smart save - generating files for single post");
        $this->generateFilesForSinglePost($postId, $post);

        // Check if this post affects global files
        if ($this->postAffectsGlobalFiles($postId, $post)) {
            error_log("FilesManagerService: Post affects global files - regenerating global dependencies");
            $this->regenerateGlobalFiles();
        } else {
            error_log("FilesManagerService: Post only affects itself - skipping global regeneration");
        }
    }

    public function handlePostRename(int $postId, WP_Post $postAfter, WP_Post $postBefore): void
    {
        if ($postAfter->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        if ($postBefore->post_name === $postAfter->post_name) {
            return;
        }

        error_log("FilesManagerService: Post renamed from '{$postBefore->post_name}' to '{$postAfter->post_name}'");
        $this->regenerateAllFiles();
    }

    public function handlePostDeletion(int $postId): void
    {
        $post = get_post($postId);
        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        error_log("FilesManagerService: Post deleted (ID: $postId, slug: {$post->post_name})");
        $this->regenerateAllFiles();
    }

    public function regenerateAllFiles(): void
    {
        error_log("FilesManagerService: Starting full regeneration of all files");

        $this->directoryManager->cleanupAllFiles();

        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'publish',
            'numberposts' => -1
        ]);

        error_log("FilesManagerService: Found " . count($posts) . " posts to process");

        if (empty($posts)) {
            error_log("FilesManagerService: No posts found, skipping file generation");
            return;
        }

        $this->directoryManager->ensureBaseDirectoryExists();

        foreach ($posts as $post) {
            $this->generateFilesForSinglePost($post->ID, $post);
        }

        error_log("FilesManagerService: Full regeneration completed");
    }

    public function generateFilesForSinglePost(int $postId, WP_Post $post): void
    {
        $terms = wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy());
        if (empty($terms) || is_wp_error($terms)) {
            error_log("FilesManagerService: No terms found for post ID: $postId");
            return;
        }

        foreach ($terms as $term) {
            $this->processContentType($postId, $post, $term->slug);
        }
    }

    public function debugTest(): string
    {
        error_log("FilesManagerService: Debug test started");
        error_log("FilesManagerService: Base dir: " . $this->directoryManager->getBaseDirectory());

        $this->directoryManager->ensureBaseDirectoryExists();

        $mapping = $this->generationMapper->getContentTypeMapping();
        error_log("FilesManagerService: Content type mapping: " . print_r($mapping, true));

        return "Debug test completed - check error logs";
    }

    private function processContentType(int $postId, WP_Post $post, string $contentType): void
    {
        $generators = $this->generationMapper->getGeneratorsForContentType($contentType);

        if (empty($generators)) {
            error_log("FilesManagerService: No generators found for content type: $contentType");
            return;
        }

        $outputPath = $this->determineOutputPath($contentType, $post);

        error_log("FilesManagerService: Processing content type '$contentType' for post '{$post->post_name}' -> $outputPath");

        foreach ($generators as $generatorName => $generator) {
            if (!$generator->validate($postId)) {
                error_log("FilesManagerService: Validation failed for generator '$generatorName' on post ID: $postId");
                continue;
            }

            $success = $generator->generate($postId, $post, $outputPath);

            if ($success) {
                error_log("FilesManagerService: Successfully generated file using '$generatorName' for post '{$post->post_name}'");
            } else {
                error_log("FilesManagerService: Failed to generate file using '$generatorName' for post '{$post->post_name}'");
            }
        }
    }

    private function determineOutputPath(string $contentType, WP_Post $post): string
    {
        switch ($contentType) {
            case FunculoTypeTaxonomy::getTermBlocks():
                return $this->directoryManager->createBlockDirectory($post->post_name);

            case FunculoTypeTaxonomy::getTermSymbols():
                return $this->directoryManager->ensureSubdirectoryExists('symbols');

            case FunculoTypeTaxonomy::getTermScssPartials():
                return $this->directoryManager->ensureSubdirectoryExists('scss');

            default:
                error_log("FilesManagerService: Unknown content type: $contentType");
                return $this->directoryManager->getBaseDirectory();
        }
    }

    /**
     * Check if a post affects global files that would require regenerating other posts
     */
    private function postAffectsGlobalFiles(int $postId, WP_Post $post): bool
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
                    error_log("FilesManagerService: Post $postId is a global SCSS partial - affects other posts");
                    return true; // This affects all blocks that use global partials
                }
            }
        }

        error_log("FilesManagerService: Post $postId only affects its own files");
        return false; // Only affects this post's files
    }

    /**
     * Regenerate only global files and dependencies (not individual post files)
     */
    private function regenerateGlobalFiles(): void
    {
        error_log("FilesManagerService: Regenerating global files and dependencies");

        // Get all posts that might need their files updated due to global changes
        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'publish',
            'numberposts' => -1
        ]);

        // Regenerate files for posts that use global SCSS partials
        foreach ($posts as $post) {
            $terms = wp_get_post_terms($post->ID, FunculoTypeTaxonomy::getTaxonomy());

            foreach ($terms as $term) {
                if ($term->slug === FunculoTypeTaxonomy::getTermBlocks()) {
                    // Check if this block uses any global partials
                    $selectedPartials = get_post_meta($post->ID, MetaKeysConstants::BLOCK_SELECTED_PARTIALS, true);
                    if (!empty($selectedPartials)) {
                        error_log("FilesManagerService: Regenerating block '{$post->post_name}' due to global SCSS changes");
                        $this->generateFilesForSinglePost($post->ID, $post);
                    }
                    break;
                }
            }
        }

        error_log("FilesManagerService: Global files regeneration completed");
    }
}