<?php

namespace Fanculo\FilesManager\Files;

use Fanculo\FilesManager\Interfaces\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use WP_Post;

class EditorStyle implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        // Try to get compiled editor CSS first
        $editorCssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, true);

        // If no compiled CSS, fall back to SCSS content as CSS (basic fallback)
        if (empty($editorCssContent)) {
            $editorScssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, true);
            if (!empty($editorScssContent)) {
                $editorCssContent = $editorScssContent;
            }
        }

        $cssFilepath = $outputPath . '/' . $this->getGeneratedFileName($post);
        $sourceMapFilepath = $outputPath . '/' . $this->getSourceMapFileName($post);

        // If content is empty, delete existing files
        if (empty($editorCssContent)) {
            $deleted = true;
            if (file_exists($cssFilepath)) {
                $deleted = $deleted && unlink($cssFilepath);
            }
            if (file_exists($sourceMapFilepath)) {
                $deleted = $deleted && unlink($sourceMapFilepath);
            }
            return $deleted;
        }

        // Generate source map for debugging
        $sourceMap = $this->generateSourceMap($post, $editorCssContent);

        // Add source map reference to CSS
        $cssWithSourceMap = $editorCssContent . "\n/*# sourceMappingURL=" . basename($sourceMapFilepath) . " */";

        // Write CSS file
        $cssWritten = file_put_contents($cssFilepath, $cssWithSourceMap) !== false;

        // Write source map file
        $sourceMapWritten = file_put_contents($sourceMapFilepath, $sourceMap) !== false;

        return $cssWritten && $sourceMapWritten;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, MetaKeysConstants::BLOCK_EDITOR_SCSS];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'editor.css';
    }

    public function getFileExtension(): string
    {
        return 'css';
    }

    public function validate(int $postId): bool
    {
        // Always return true so generator can run to either create or delete files
        return true;
    }

    /**
     * Get source map filename
     */
    private function getSourceMapFileName(WP_Post $post): string
    {
        return 'editor.css.map';
    }

    /**
     * Generate source map for CSS debugging
     */
    private function generateSourceMap(WP_Post $post, string $cssContent): string
    {
        $sourceMap = [
            'version' => 3,
            'file' => 'editor.css',
            'sources' => ['editor.scss'],
            'sourcesContent' => [get_post_meta($post->ID, MetaKeysConstants::BLOCK_EDITOR_SCSS, true) ?: ''],
            'names' => [],
            'mappings' => $this->generateBasicMappings($cssContent)
        ];

        return json_encode($sourceMap, JSON_PRETTY_PRINT);
    }

    /**
     * Generate basic source mappings (simplified approach)
     */
    private function generateBasicMappings(string $cssContent): string
    {
        // Simple mapping - each line in CSS maps to corresponding line in SCSS
        // This is a basic implementation, more sophisticated mapping could be added later
        $lines = explode("\n", $cssContent);
        $mappings = [];

        foreach ($lines as $index => $line) {
            if (trim($line) !== '') {
                // Basic mapping format: column 0 of generated line maps to column 0 of source line
                $mappings[] = 'AAAA';
            } else {
                $mappings[] = '';
            }
        }

        return implode(';', $mappings);
    }
}