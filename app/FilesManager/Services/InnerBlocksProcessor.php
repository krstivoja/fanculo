<?php

namespace Fanculo\FilesManager\Services;

/**
 * InnerBlocks processor service
 * Handles the replacement of <InnerBlocks /> placeholders in block templates
 */
class InnerBlocksProcessor
{
    /**
     * Regex pattern for detecting InnerBlocks placeholders (case-insensitive)
     * Matches: <InnerBlocks />, <innerblock />, <Innerblocks />, <innerBlocks />, <innerblocks></innerblocks>, etc.
     */
    private const INNERBLOCKS_PATTERN = '/<inner\s*blocks?\s*\/?>\s*(?:<\/inner\s*blocks?\s*>)?/i';

    /**
     * Check if content contains InnerBlocks placeholders
     *
     * @param string $content Content to check
     * @return bool True if InnerBlocks found
     */
    public static function hasInnerBlocks(string $content): bool
    {
        return preg_match(self::INNERBLOCKS_PATTERN, $content) === 1;
    }

    /**
     * Check if a specific file contains InnerBlocks placeholders
     *
     * @param string $filePath Path to the file to check
     * @return bool True if file exists and contains InnerBlocks
     */
    public static function fileHasInnerBlocks(string $filePath): bool
    {
        if (!file_exists($filePath)) {
            return false;
        }

        $content = file_get_contents($filePath);
        return $content !== false && self::hasInnerBlocks($content);
    }

    /**
     * Process a block template and replace <InnerBlocks /> with appropriate content
     *
     * @param string $templatePath Path to the clean template file
     * @param array $attributes Block attributes
     * @param string $content Inner blocks content
     * @param \WP_Block|null $block Block instance
     * @return string Processed HTML
     */
    public static function processTemplate(string $templatePath, array $attributes = [], string $content = '', $block = null): string
    {
        if (!file_exists($templatePath)) {
            return '';
        }

        // Make variables available to the template
        $GLOBALS['attributes'] = $attributes;
        $GLOBALS['content'] = $content;
        $GLOBALS['block'] = $block;

        // Start output buffering to capture the template output
        ob_start();

        // Make variables available to the render file
        $block_attributes = $attributes;
        $block_content = $content;
        $block_instance = $block;

        // Include the clean template
        include $templatePath;

        // Get the rendered content
        $renderedContent = ob_get_clean();

        // Check if we're in editor context (when ServerSideRender is being used)
        $isEditorContext = defined('REST_REQUEST') && REST_REQUEST;

        if ($isEditorContext) {
            // In editor: replace any InnerBlocks variation with standardized placeholder for JavaScript
            return preg_replace(
                self::INNERBLOCKS_PATTERN,
                '<div class="fanculo-block-inserter"></div>',
                $renderedContent
            );
        } else {
            // On frontend: replace <InnerBlocks /> with actual inner blocks content
            return preg_replace(
                self::INNERBLOCKS_PATTERN,
                $content ?? '',
                $renderedContent
            );
        }
    }

    /**
     * Create a render callback that uses the InnerBlocks processor
     *
     * @param string $templatePath Path to the clean template file
     * @return callable Render callback function
     */
    public static function createRenderCallback(string $templatePath): callable
    {
        return function ($attributes, $content, $block) use ($templatePath) {
            return self::processTemplate($templatePath, $attributes, $content, $block);
        };
    }

    /**
     * Check if any block render templates contain <InnerBlocks /> placeholders
     *
     * @return bool True if any templates contain InnerBlocks
     */
    public static function hasInnerBlocksInTemplates(): bool
    {
        if (!defined('FANCULO_BLOCKS_DIR')) {
            return false;
        }

        $renderFiles = glob(FANCULO_BLOCKS_DIR . '/*/render.php');

        foreach ($renderFiles as $renderFile) {
            if (self::fileHasInnerBlocks($renderFile)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Enqueue the InnerBlocks parser script if needed
     */
    public static function enqueueParserScript(): void
    {
        // No-op: handled by block-renderer.js
    }
}
