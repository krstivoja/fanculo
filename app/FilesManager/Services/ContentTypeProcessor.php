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
            error_log("Fanculo ContentTypeProcessor: File change check for {$generator->getGeneratedFileName($post)} - changed: " . ($fileChanged ? 'yes' : 'no'));
            if ($fileChanged) {
                error_log("Fanculo ContentTypeProcessor: Triggering fanculo_file_generated action for post $postId, file {$generator->getGeneratedFileName($post)}");
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
     * Check if file content has changed by comparing with existing file
     */
    private function hasFileContentChanged(int $postId, string $filePath, $generator): bool
    {
        // If file doesn't exist, it's considered changed
        if (!file_exists($filePath)) {
            return true;
        }

        // Get current file content
        $currentContent = file_get_contents($filePath);
        if ($currentContent === false) {
            return true;
        }

        // Generate new content to compare
        $tempPost = get_post($postId);
        if (!$tempPost) {
            return false;
        }

        // Create a temporary file to get the new content
        $tempPath = $filePath . '.temp';
        $generated = $generator->generate($postId, $tempPost, dirname($filePath));
        
        if (!$generated) {
            return false;
        }

        // Read the newly generated content
        $newContent = file_get_contents($filePath);
        if ($newContent === false) {
            return false;
        }

        // Compare content
        $changed = $currentContent !== $newContent;

        // Clean up temp file if it was created
        if (file_exists($tempPath)) {
            unlink($tempPath);
        }

        return $changed;
    }
}