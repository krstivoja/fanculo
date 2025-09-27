<?php

namespace Fanculo\FilesManager\Files;

use Fanculo\FilesManager\Interfaces\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\FilesManager\Services\AttributeMapper;
use Fanculo\Database\BlockSettingsRepository;
use WP_Post;

class BlockJson implements FileGeneratorInterface
{
    public function canGenerate(string $contentType): bool
    {
        return $contentType === FunculoTypeTaxonomy::getTermBlocks();
    }

    public function generate(int $postId, WP_Post $post, string $outputPath): bool
    {
        // Verify and create output path if needed
        if (!is_dir($outputPath)) {
            if (!wp_mkdir_p($outputPath)) {
                error_log('BlockJson: Failed to create output directory: ' . $outputPath);
                return false;
            }
        }

        $attributes = get_post_meta($postId, MetaKeysConstants::BLOCK_ATTRIBUTES, true);

        // Get settings from database
        $dbSettings = BlockSettingsRepository::get($postId);
        $settings = $dbSettings ? [
            'category' => $dbSettings['category'],
            'description' => $dbSettings['description'],
            'icon' => $dbSettings['icon']
        ] : [];

        $blockJson = $this->buildBlockJson($post, $attributes, $settings, $outputPath, $dbSettings);
        $filepath = $outputPath . '/' . $this->getGeneratedFileName($post);

        $result = file_put_contents($filepath, wp_json_encode($blockJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        if ($result === false) {
            error_log('BlockJson: Failed to write block.json file: ' . $filepath);
            return false;
        }

        return true;
    }

    public function getRequiredMetaKeys(): array
    {
        return [MetaKeysConstants::BLOCK_ATTRIBUTES];
    }

    public function getGeneratedFileName(WP_Post $post): string
    {
        return 'block.json';
    }

    public function getFileExtension(): string
    {
        return 'json';
    }

    public function validate(int $postId): bool
    {
        return true; // block.json is always generated for blocks
    }

    private function buildBlockJson(WP_Post $post, $attributes, $settings, string $outputPath, ?array $dbSettings): array
    {
        // Parse settings data with validation
        $settingsData = [];
        if (!empty($settings)) {
            if (is_string($settings)) {
                $decodedSettings = json_decode($settings, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decodedSettings)) {
                    $settingsData = $decodedSettings;
                }
            } elseif (is_array($settings)) {
                $settingsData = $settings;
            }
        }

        // Detect inner blocks usage from database settings or render template
        $innerBlocksEnabled = $dbSettings['supports_inner_blocks'] ?? false;

        $renderContainsInnerBlocks = false;
        $renderFile = $outputPath . '/render.php';
        if (file_exists($renderFile)) {
            $renderContents = file_get_contents($renderFile);
            if ($renderContents !== false) {
                $renderContainsInnerBlocks = stripos($renderContents, '<innerblocks') !== false;
            }
        }

        $usesInnerBlocks = $innerBlocksEnabled || $renderContainsInnerBlocks;

        // Build default block.json structure
        $blockJson = [
            '$schema' => 'https://schemas.wp.org/trunk/block.json',
            'apiVersion' => 3,
            'name' => 'fanculo/' . $post->post_name,
            'version' => '1.0.0',
            'title' => $post->post_title,
        ];

        // Add configurable properties from settings with defaults
        $blockJson['category'] = isset($settingsData['category']) && !empty($settingsData['category'])
            ? sanitize_text_field($settingsData['category'])
            : 'theme';

        $blockJson['icon'] = isset($settingsData['icon']) && !empty($settingsData['icon'])
            ? sanitize_text_field($settingsData['icon'])
            : 'smiley';

        $blockJson['description'] = isset($settingsData['description']) && !empty($settingsData['description'])
            ? sanitize_text_field($settingsData['description'])
            : '';

        // Add supports with defaults that can be overridden
        $defaultSupports = [
            'html' => $usesInnerBlocks
        ];

        // Add interactivity support if view.js will be generated
        $jsContent = get_post_meta($post->ID, MetaKeysConstants::BLOCK_JS, true);
        if (!empty($jsContent)) {
            $defaultSupports['interactivity'] = true;
        }

        if (isset($settingsData['supports']) && is_array($settingsData['supports'])) {
            $blockJson['supports'] = wp_parse_args($settingsData['supports'], $defaultSupports);
        } else {
            $blockJson['supports'] = $defaultSupports;
        }

        if ($usesInnerBlocks) {
            $blockJson['supports']['html'] = true;

            if (!isset($blockJson['supports']['innerBlocks'])) {
                $blockJson['supports']['innerBlocks'] = true;
            }
        }

        $blockJson['textdomain'] = 'fanculo';

        // Conditionally add asset files only if they exist
        $this->addConditionalAssets($blockJson, $outputPath, $post->ID);

        // Add attributes using AttributeMapper for consistent schema generation
        $attributeSchema = AttributeMapper::generateAttributeSchema($post->ID);
        if (!empty($attributeSchema)) {
            $blockJson['attributes'] = $attributeSchema;
        }

        // Deep merge additional settings (excluding already processed ones)
        $excludedKeys = ['category', 'icon', 'description', 'supports', 'allowedBlocks', 'innerBlocks'];
        foreach ($settingsData as $key => $value) {
            if (!in_array($key, $excludedKeys, true) && !isset($blockJson[$key])) {
                $blockJson[$key] = $value;
            }
        }

        return $blockJson;
    }

    /**
     * Add asset files to block.json only if they exist
     * @param array &$blockJson Block configuration array
     * @param string $outputPath Output directory path
     * @param int $postId Post ID for checking meta content
     */
    private function addConditionalAssets(array &$blockJson, string $outputPath, int $postId): void
    {
        // Define potential asset files
        $assetFiles = [
            'editorScript' => 'index.js',
            'style' => 'style.css',
            'editorStyle' => 'editor.css',
            'render' => 'render.php',
            'viewScriptModule' => 'view.js'
        ];

        foreach ($assetFiles as $property => $filename) {
            $filePath = $outputPath . '/' . $filename;

            // Only add the asset if file exists or will be generated
            if (file_exists($filePath) || $this->willFileBeGenerated($filename, $postId)) {
                $blockJson[$property] = 'file:./' . $filename;
            }
        }
    }

    /**
     * Check if a file will be generated by other generators
     * @param string $filename The filename to check
     * @param int $postId The post ID to check meta content for
     * @return bool Whether the file will be generated
     */
    private function willFileBeGenerated(string $filename, int $postId): bool
    {
        switch ($filename) {
            case 'index.js':
            case 'render.php':
                // These are always generated for blocks
                return true;

            case 'style.css':
                // Check if we have CSS content to generate
                $cssContent = get_post_meta($postId, MetaKeysConstants::CSS_CONTENT, true);
                $scssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_SCSS, true);
                return !empty($cssContent) || !empty($scssContent);

            case 'editor.css':
                // Check if we have editor CSS content to generate
                $editorCssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, true);
                $editorScssContent = get_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_SCSS, true);
                return !empty($editorCssContent) || !empty($editorScssContent);

            case 'view.js':
                // Check if we have JS content to generate
                $jsContent = get_post_meta($postId, MetaKeysConstants::BLOCK_JS, true);
                return !empty($jsContent);

            default:
                return false;
        }
    }
}
