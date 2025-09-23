<?php

namespace Fanculo\FilesManager\Files;

use Fanculo\FilesManager\Interfaces\FileGeneratorInterface;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\FilesManager\Services\AttributeMapper;
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
        $settings = get_post_meta($postId, MetaKeysConstants::BLOCK_SETTINGS, true);

        $blockJson = $this->buildBlockJson($post, $attributes, $settings, $outputPath);
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
        return [MetaKeysConstants::BLOCK_ATTRIBUTES, MetaKeysConstants::BLOCK_SETTINGS];
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

    private function buildBlockJson(WP_Post $post, $attributes, $settings, string $outputPath): array
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
            'html' => false,
            'interactivity' => true
        ];

        if (isset($settingsData['supports']) && is_array($settingsData['supports'])) {
            $blockJson['supports'] = wp_parse_args($settingsData['supports'], $defaultSupports);
        } else {
            $blockJson['supports'] = $defaultSupports;
        }

        $blockJson['textdomain'] = 'fanculo';

        // Conditionally add asset files only if they exist
        $this->addConditionalAssets($blockJson, $outputPath);

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
     */
    private function addConditionalAssets(array &$blockJson, string $outputPath): void
    {
        // Define potential asset files
        // Always use viewScriptModule for modern Script Module support
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
            if (file_exists($filePath) || $this->willFileBeGenerated($filename)) {
                $blockJson[$property] = 'file:./' . $filename;
            }
        }
    }

    /**
     * Check if a file will be generated by other generators
     * @param string $filename The filename to check
     * @return bool Whether the file will be generated
     */
    private function willFileBeGenerated(string $filename): bool
    {
        // These files are always generated for blocks
        $alwaysGenerated = ['index.js', 'render.php', 'style.css'];

        return in_array($filename, $alwaysGenerated, true);
    }
}