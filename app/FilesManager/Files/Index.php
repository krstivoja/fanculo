<?php

namespace Fanculo\FilesManager\Files;

use Fanculo\FilesManager\Services\AttributeMapper;
use Fanculo\Database\BlockSettingsRepository;

class Index
{
    public static function generate(string $blockDir, string $blockSlug, int $postId = null): bool
    {
        $indexJsPath = $blockDir . '/index.js';

        // Get inner blocks settings from database if post ID is provided
        $innerBlocksEnabled = false;
        $allowedBlocks = [];
        $dbSettings = null;

        if ($postId) {
            $dbSettings = BlockSettingsRepository::get($postId);
            if ($dbSettings) {
                $innerBlocksEnabled = $dbSettings['supports_inner_blocks'];
                $allowedBlocks = $dbSettings['allowed_block_types'] ?? [];

                // Additional validation for allowed blocks array
                $allowedBlocks = array_filter($allowedBlocks, function($block) {
                    return is_string($block) && !empty($block);
                });
            }
        }

        // Detect InnerBlocks usage directly in the render template
        $renderContainsInnerBlocks = false;
        $renderPath = $blockDir . '/render.php';
        if (file_exists($renderPath)) {
            $renderContent = file_get_contents($renderPath);
            if ($renderContent !== false) {
                $renderContainsInnerBlocks = stripos($renderContent, '<innerblocks') !== false;
            }
        }

        $usesInnerBlocks = $innerBlocksEnabled || $renderContainsInnerBlocks;

        // Build the PARSER_OPTIONS based on inner blocks settings
        $parserOptionsJs = '';
        if ($innerBlocksEnabled) {
            $allowedBlocks = array_values($allowedBlocks);
            $allowedBlocksJson = empty($allowedBlocks)
                ? 'null'
                : wp_json_encode($allowedBlocks, JSON_UNESCAPED_SLASHES);

            // Get template and templateLock from database settings if available
            $template = '[]'; // Default to empty template
            $templateLock = 'false';

            if ($postId && $dbSettings) {
                // Convert template array to nested format for InnerBlocks
                if (!empty($dbSettings['template'])) {
                    $templateArray = [];
                    foreach ($dbSettings['template'] as $blockName) {
                        $templateArray[] = [$blockName];
                    }
                    $template = wp_json_encode($templateArray, JSON_UNESCAPED_SLASHES);
                }

                if (!empty($dbSettings['template_lock'])) {
                    $templateLock = ($dbSettings['template_lock'] === 'true' || $dbSettings['template_lock'] === '1') ? 'true' : 'false';
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
        } elseif ($usesInnerBlocks) {
            $parserOptionsJs = "
    // InnerBlocks detected without explicit settings
    const PARSER_OPTIONS = {
        allowedBlocks: null
    };";
        } else {
            $parserOptionsJs = "
    // No inner blocks - empty options
    const PARSER_OPTIONS = {};";
        }

        // Build the save function based on inner blocks settings
        $saveFunction = $usesInnerBlocks
            ? 'return wp.element.createElement(InnerBlocks.Content);'
            : 'return null; // Server-side rendering';

        // Get block metadata for registration
        $blockTitle = get_the_title($postId) ?: 'Untitled Block';
        $blockDescription = '';

        if ($postId && $dbSettings) {
            $blockDescription = !empty($dbSettings['description']) ? sanitize_text_field($dbSettings['description']) : '';
        }

        // Generate sidebar controls based on attributes
        $sidebarControls = '';
        $hasAttributes = false;
        if ($postId && AttributeMapper::hasAttributes($postId)) {
            $hasAttributes = true;
            $sidebarControls = AttributeMapper::generateSidebarControls($postId);
        }

        // Component imports for attributes
        $componentImports = $hasAttributes ? AttributeMapper::generateComponentImports() : '';

        $content = '(function () {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks, InspectorControls } = wp.blockEditor;
' . $componentImports . '
' . $parserOptionsJs . '

    // Use wp.domReady for proper dependency loading
    wp.domReady(function() {
        // Ensure FanculoBlockRenderer is available
        if (!window.FanculoBlockRenderer?.createServerRenderComponent) {
            console.error("FanculoBlockRenderer not available for block: fanculo/BLOCK_SLUG_PLACEHOLDER");
            return;
        }

        // Create enhanced edit component with sidebar controls
        const BaseEdit = window.FanculoBlockRenderer.createServerRenderComponent(
            "fanculo/BLOCK_SLUG_PLACEHOLDER",
            PARSER_OPTIONS
        );

        const Edit = function(props) {
            const { attributes, setAttributes } = props;
            const hasAttributePanel = ' . ($hasAttributes ? 'true' : 'false') . ';

            return wp.element.createElement(wp.element.Fragment, null,
                // Add InspectorControls with attribute panels
                hasAttributePanel && wp.element.createElement(InspectorControls, { key: "inspector" },
                    wp.element.createElement(PanelBody, {
                        title: "Block Settings",
                        initialOpen: true
                    }, [' . $sidebarControls . '])
                ),
                // Render the actual block content
                wp.element.createElement(BaseEdit, props)
            );
        };

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
