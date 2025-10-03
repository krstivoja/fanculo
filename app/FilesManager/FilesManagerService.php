<?php

namespace FanCoolo\FilesManager;

use FanCoolo\FilesManager\Services\DirectoryManager;
use FanCoolo\FilesManager\Services\FileWriter;
use FanCoolo\FilesManager\Services\GenerationCoordinator;
use FanCoolo\FilesManager\Services\ContentTypeProcessor;
use FanCoolo\FilesManager\Services\GlobalRegenerator;
use FanCoolo\FilesManager\Mappers\GenerationMapper;
use FanCoolo\Content\FunculoPostType;
use FanCoolo\Content\FunculoTypeTaxonomy;
use FanCoolo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class FilesManagerService
{
    private $directoryManager;
    private $fileWriter;
    private $generationMapper;
    private $generationCoordinator;
    private $contentTypeProcessor;
    private $globalRegenerator;

    public function __construct()
    {
        // Legacy dependencies
        $this->directoryManager = new DirectoryManager();
        $this->fileWriter = new FileWriter();
        $this->generationMapper = new GenerationMapper();

        // New architecture dependencies
        $this->generationCoordinator = new GenerationCoordinator();
        $this->contentTypeProcessor = new ContentTypeProcessor();
        $this->globalRegenerator = new GlobalRegenerator();
    }

    public function generateFilesOnPostSave(int $postId, WP_Post $post, bool $update): void
    {
        // Delegate to the new GenerationCoordinator
        $this->generationCoordinator->handlePostSave($postId, $post, $update);
    }

    public function handlePostRename(int $postId, WP_Post $postAfter, WP_Post $postBefore): void
    {
        // Delegate to the new GenerationCoordinator
        $this->generationCoordinator->handlePostRename($postId, $postAfter, $postBefore);
    }

    public function handlePostDeletion(int $postId): void
    {
        // Delegate to the new GenerationCoordinator
        $this->generationCoordinator->handlePostDeletion($postId);
    }

    public function regenerateAllFiles(): void
    {
        // Delegate to the new GenerationCoordinator
        $this->generationCoordinator->regenerateAllFiles();
    }

    public function generateFilesForSinglePost(int $postId, WP_Post $post): void
    {
        // Delegate to the new GenerationCoordinator
        $this->generationCoordinator->generateFilesForSinglePost($postId, $post);
    }

    public function debugTest(): string
    {
        $this->directoryManager->ensureBaseDirectoryExists();

        $mapping = $this->generationMapper->getContentTypeMapping();

        // Test new architecture components
        $globalStats = $this->globalRegenerator->getGlobalImpactStats();

        return "Debug test completed with new architecture";
    }

    // Legacy support methods - kept for backwards compatibility
    // These methods now delegate to the new architecture

    /**
     * @deprecated Use GenerationCoordinator->handlePostSave() directly
     */
    public function processContentType(int $postId, WP_Post $post, string $contentType): void
    {
        $this->contentTypeProcessor->processContentType($postId, $post, $contentType);
    }

    /**
     * @deprecated Use ContentTypeProcessor->getOutputPathForContentType() directly
     */
    public function determineOutputPath(string $contentType, WP_Post $post): string
    {
        return $this->contentTypeProcessor->getOutputPathForContentType($contentType, $post);
    }

    /**
     * @deprecated Use GlobalRegenerator->detectGlobalImpact() directly
     */
    public function postAffectsGlobalFiles(int $postId, WP_Post $post): bool
    {
        return $this->globalRegenerator->detectGlobalImpact($postId, $post);
    }

    /**
     * @deprecated Use GlobalRegenerator->regenerateGlobalDependencies() directly
     */
    public function regenerateGlobalFiles(): void
    {
        $this->globalRegenerator->regenerateGlobalDependencies();
    }
}