<?php

namespace Fanculo\FilesManager\Services;

use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\FilesManager\Mappers\GenerationMapper;
use WP_Post;

class ContentTypeProcessor
{
    private $generationMapper;
    private $directoryManager;

    public function __construct()
    {
        $this->generationMapper = new GenerationMapper();
        $this->directoryManager = new DirectoryManager();
    }

    /**
     * Process a specific content type for a post
     */
    public function processContentType(int $postId, WP_Post $post, string $contentType): void
    {
        if (!$this->validateContentForType($postId, $contentType)) {
            error_log("ContentTypeProcessor: Validation failed for content type '$contentType' on post ID: $postId");
            return;
        }

        $generators = $this->generationMapper->getGeneratorsForContentType($contentType);

        if (empty($generators)) {
            error_log("ContentTypeProcessor: No generators found for content type: $contentType");
            return;
        }

        $outputPath = $this->getOutputPathForContentType($contentType, $post);

        error_log("ContentTypeProcessor: Processing content type '$contentType' for post '{$post->post_name}' -> $outputPath");

        foreach ($generators as $generatorName => $generator) {
            if (!$generator->validate($postId)) {
                error_log("ContentTypeProcessor: Validation failed for generator '$generatorName' on post ID: $postId");
                continue;
            }

            $success = $generator->generate($postId, $post, $outputPath);

            if ($success) {
                error_log("ContentTypeProcessor: Successfully generated file using '$generatorName' for post '{$post->post_name}'");
            } else {
                error_log("ContentTypeProcessor: Failed to generate file using '$generatorName' for post '{$post->post_name}'");
            }
        }
    }

    /**
     * Determine output path for a content type
     */
    public function getOutputPathForContentType(string $contentType, WP_Post $post): string
    {
        switch ($contentType) {
            case FunculoTypeTaxonomy::getTermBlocks():
                return $this->directoryManager->createBlockDirectory($post->post_name);

            case FunculoTypeTaxonomy::getTermSymbols():
                return $this->directoryManager->ensureSubdirectoryExists('symbols');

            case FunculoTypeTaxonomy::getTermScssPartials():
                return $this->directoryManager->ensureSubdirectoryExists('scss');

            default:
                error_log("ContentTypeProcessor: Unknown content type: $contentType");
                return $this->directoryManager->getBaseDirectory();
        }
    }

    /**
     * Validate content before processing
     */
    public function validateContentForType(int $postId, string $contentType): bool
    {
        // Basic validation - ensure the content type is valid
        $validContentTypes = [
            FunculoTypeTaxonomy::getTermBlocks(),
            FunculoTypeTaxonomy::getTermSymbols(),
            FunculoTypeTaxonomy::getTermScssPartials()
        ];

        if (!in_array($contentType, $validContentTypes)) {
            error_log("ContentTypeProcessor: Invalid content type: $contentType");
            return false;
        }

        // Validate post exists and is published
        $post = get_post($postId);
        if (!$post || $post->post_status !== 'publish') {
            error_log("ContentTypeProcessor: Post $postId is not published or doesn't exist");
            return false;
        }

        // Content-specific validation
        switch ($contentType) {
            case FunculoTypeTaxonomy::getTermBlocks():
                return $this->validateBlockContent($postId);

            case FunculoTypeTaxonomy::getTermSymbols():
                return $this->validateSymbolContent($postId);

            case FunculoTypeTaxonomy::getTermScssPartials():
                return $this->validateScssPartialContent($postId);

            default:
                return true;
        }
    }

    /**
     * Validate block-specific content
     */
    private function validateBlockContent(int $postId): bool
    {
        // TODO: Add block-specific validation:
        // - Check for required meta fields
        // - Validate PHP syntax if present
        // - Validate JSON structure for attributes

        return true;
    }

    /**
     * Validate symbol-specific content
     */
    private function validateSymbolContent(int $postId): bool
    {
        // TODO: Add symbol-specific validation:
        // - Check for required meta fields
        // - Validate PHP syntax if present

        return true;
    }

    /**
     * Validate SCSS partial content
     */
    private function validateScssPartialContent(int $postId): bool
    {
        // TODO: Add SCSS-specific validation:
        // - Check for SCSS syntax errors
        // - Validate imported partials exist

        return true;
    }

    /**
     * Get all valid content types
     */
    public function getValidContentTypes(): array
    {
        return [
            FunculoTypeTaxonomy::getTermBlocks(),
            FunculoTypeTaxonomy::getTermSymbols(),
            FunculoTypeTaxonomy::getTermScssPartials()
        ];
    }

    /**
     * Check if a content type requires specific validation
     */
    public function requiresValidation(string $contentType): bool
    {
        // All content types should be validated
        return true;
    }
}