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
            return;
        }

        $generators = $this->generationMapper->getGeneratorsForContentType($contentType);

        if (empty($generators)) {
            return;
        }

        $outputPath = $this->getOutputPathForContentType($contentType, $post, $postId);


        foreach ($generators as $generatorName => $generator) {
            if (!$generator->validate($postId)) {
                continue;
            }

            // Check if file content has changed before generating
            $filePath = $outputPath . '/' . $generator->getGeneratedFileName($post);
            $fileChanged = $this->hasFileContentChanged($postId, $filePath, $generator);

            // Generate the file
            $generator->generate($postId, $post, $outputPath);

            // Trigger hot reload event if file changed
            if ($fileChanged) {
                do_action('fanculo_file_generated', $postId, $generator->getGeneratedFileName($post), $filePath, $fileChanged);
            }
        }
    }

    /**
     * Determine output path for a content type
     */
    public function getOutputPathForContentType(string $contentType, WP_Post $post, int $postId = null): string
    {
        switch ($contentType) {
            case FunculoTypeTaxonomy::getTermBlocks():
                return $this->directoryManager->createBlockDirectory($post->post_name, $postId);

            case FunculoTypeTaxonomy::getTermSymbols():
                return $this->directoryManager->ensureSubdirectoryExists('symbols');

            case FunculoTypeTaxonomy::getTermScssPartials():
                return $this->directoryManager->ensureSubdirectoryExists('scss');

            default:
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
            return false;
        }

        // Validate post exists and is published
        $post = get_post($postId);
        if (!$post || $post->post_status !== 'publish') {
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

    /**
     * Check if file content has changed - simplified for hot reload
     */
    private function hasFileContentChanged(int $postId, string $filePath, $generator): bool
    {
        // Always assume file changed for hot reload - let the browser handle optimization
        return true;
    }
}