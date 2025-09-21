<?php

namespace Fanculo\FilesManager\Generators;

use Fanculo\Admin\Api\Services\MetaKeysConstants;

class Index
{
    public static function generate(string $blockDir, string $blockSlug, int $postId = null): bool
    {
        $indexJsPath = $blockDir . '/index.js';

        // Get inner blocks settings if post ID is provided
        $innerBlocksEnabled = false;
        $allowedBlocks = [];

        if ($postId) {
            $innerBlocksSettings = get_post_meta($postId, MetaKeysConstants::BLOCK_INNER_BLOCKS_SETTINGS, true);
            if ($innerBlocksSettings) {
                $settings = json_decode($innerBlocksSettings, true);

                // Validate JSON decode and array structure
                if (json_last_error() === JSON_ERROR_NONE && is_array($settings)) {
                    $innerBlocksEnabled = isset($settings['enabled']) && is_bool($settings['enabled']) ? $settings['enabled'] : false;
                    $allowedBlocks = isset($settings['allowed_blocks']) && is_array($settings['allowed_blocks'])
                        ? $settings['allowed_blocks']
                        : [];

                    // Additional validation for allowed blocks array
                    $allowedBlocks = array_filter($allowedBlocks, function($block) {
                        return is_string($block) && !empty($block);
                    });
                } else {
                    // Log JSON decode error for debugging
                    error_log('Fanculo Index Generator: Invalid JSON in inner blocks settings for post ' . $postId . ': ' . json_last_error_msg());
                }
            }
        }

        // Build the PARSER_OPTIONS based on inner blocks settings
        $parserOptionsJs = '';
        if ($innerBlocksEnabled) {
            $allowedBlocksJson = wp_json_encode($allowedBlocks, JSON_UNESCAPED_SLASHES);

            // Get template and templateLock from settings if available
            $template = '[]'; // Default to empty template
            $templateLock = 'false';

            if ($postId) {
                $blockSettings = get_post_meta($postId, MetaKeysConstants::BLOCK_SETTINGS, true);
                if ($blockSettings) {
                    $settingsData = json_decode($blockSettings, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($settingsData)) {
                        if (isset($settingsData['innerBlocks']['template']) && is_array($settingsData['innerBlocks']['template'])) {
                            $template = wp_json_encode($settingsData['innerBlocks']['template'], JSON_UNESCAPED_SLASHES);
                        }
                        if (isset($settingsData['innerBlocks']['templateLock'])) {
                            $templateLock = $settingsData['innerBlocks']['templateLock'] ? 'true' : 'false';
                        }
                    }
                }
            }

            // Build template property conditionally
            $templateProperty = '';
            if ($template && $template !== '[]' && !empty(json_decode($template, true))) {
                $templateProperty = "\n        template: {$template},";
            }

            $parserOptionsJs = "
    // InnerBlocks options
    const PARSER_OPTIONS = {
        allowedBlocks: {$allowedBlocksJson},{$templateProperty}
        templateLock: {$templateLock}
    };";
        } else {
            $parserOptionsJs = "
    // No inner blocks - empty options
    const PARSER_OPTIONS = {};";
        }

        // Build the save function based on inner blocks settings
        $saveFunction = $innerBlocksEnabled
            ? 'return wp.element.createElement(InnerBlocks.Content);'
            : 'return null; // Server-side rendering';

        // Get block metadata for registration
        $blockTitle = get_the_title($postId) ?: 'Untitled Block';
        $blockDescription = '';

        if ($postId) {
            $blockSettings = get_post_meta($postId, MetaKeysConstants::BLOCK_SETTINGS, true);
            if ($blockSettings) {
                $settingsData = json_decode($blockSettings, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($settingsData)) {
                    $blockDescription = isset($settingsData['description']) ? sanitize_text_field($settingsData['description']) : '';
                }
            }
        }

        $content = '(function () {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks } = wp.blockEditor;
' . $parserOptionsJs . '

    // Use wp.domReady for proper dependency loading
    wp.domReady(function() {
        // Ensure FanculoBlockRenderer is available
        if (!window.FanculoBlockRenderer?.createServerRenderComponent) {
            console.error("FanculoBlockRenderer not available for block: fanculo/BLOCK_SLUG_PLACEHOLDER");
            return;
        }

        // Use the shared FanculoBlockRenderer to create the edit component
        const Edit = window.FanculoBlockRenderer.createServerRenderComponent(
            "fanculo/BLOCK_SLUG_PLACEHOLDER",
            PARSER_OPTIONS
        );

        // Register block with metadata from generated block.json
        registerBlockType("fanculo/BLOCK_SLUG_PLACEHOLDER", {
            edit: Edit,
            save: function() {
                ' . $saveFunction . '
            }
        });
    });
})()';;

        // Replace the placeholder with actual block slug
        $content = str_replace('BLOCK_SLUG_PLACEHOLDER', $blockSlug, $content);

        // Ensure the target directory exists
        $blockDirPath = dirname($indexJsPath);
        if (!is_dir($blockDirPath)) {
            if (!wp_mkdir_p($blockDirPath)) {
                error_log('Fanculo Index Generator: Failed to create directory: ' . $blockDirPath);
                return false;
            }
        }

        // Write the file with error handling and logging
        error_log("Fanculo Index Generator: Writing to {$indexJsPath}");
        $result = file_put_contents($indexJsPath, $content);

        if ($result === false) {
            error_log('Fanculo Index Generator: Failed to write index.js file: ' . $indexJsPath);
            return false;
        }

        error_log("Fanculo Index Generator: Successfully wrote {$result} bytes to {$indexJsPath}");
        return true;
    }
}