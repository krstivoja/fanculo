<?php

namespace Fanculo\FilesManager;

use Fanculo\FilesManager\Services\DirectoryManager;
use Fanculo\FilesManager\Services\FileWriter;
use Fanculo\FilesManager\Mappers\GenerationMapper;
use Fanculo\Admin\Content\FunculoPostType;
use Fanculo\Admin\Content\FunculoTypeTaxonomy;
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

        $this->regenerateAllFiles();
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
}