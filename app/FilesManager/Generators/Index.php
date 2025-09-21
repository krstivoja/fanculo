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
        $template = [];
        $templateLock = false;

        if ($postId) {
            $innerBlocksSettings = get_post_meta($postId, MetaKeysConstants::BLOCK_INNER_BLOCKS_SETTINGS, true);
            if ($innerBlocksSettings) {
                try {
                    $settings = json_decode($innerBlocksSettings, true);
                    $innerBlocksEnabled = !empty($settings['enabled']);
                    $allowedBlocks = $settings['allowed_blocks'] ?? [];
                    $template = $settings['template'] ?? [];
                    $templateLock = $settings['template_lock'] ?? false;
                } catch (\Exception $e) {
                    // If JSON parsing fails, keep defaults
                }
            }
        }

        // Build the PARSER_OPTIONS based on inner blocks settings
        $parserOptionsJs = '';
        if ($innerBlocksEnabled) {
            $allowedBlocksJson = !empty($allowedBlocks) ? json_encode($allowedBlocks, JSON_UNESCAPED_SLASHES) : 'null';
            $templateJson = json_encode($template, JSON_UNESCAPED_SLASHES);
            $templateLockValue = $templateLock ? 'true' : 'false';

            $parserOptionsJs = "
    // InnerBlocks options
    const PARSER_OPTIONS = {" . (
                !empty($allowedBlocks) ? "
        allowedBlocks: {$allowedBlocksJson}," : ""
            ) . "
        template: {$templateJson},
        templateLock: {$templateLockValue}
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

        $content = '(function () {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks } = wp.blockEditor;
' . $parserOptionsJs . '

    try {
        // Use the shared FanculoBlockRenderer to create the edit component
        const Edit = window.FanculoBlockRenderer.createServerRenderComponent(
            "fanculo/BLOCK_SLUG_PLACEHOLDER",
            PARSER_OPTIONS
        );

        registerBlockType("fanculo/BLOCK_SLUG_PLACEHOLDER", {
            edit: Edit,
            save: function() {
                ' . $saveFunction . '
            }
        });
    } catch (error) {
        console.error("Error registering block fanculo/BLOCK_SLUG_PLACEHOLDER:", error);
        // Register with error fallback
        registerBlockType("fanculo/BLOCK_SLUG_PLACEHOLDER", {
            edit: function() {
                return wp.element.createElement("div",
                    { className: "fanculo-block-error" },
                    "Block registration error: " + error.message
                );
            },
            save: function() {
                return null;
            }
        });
    }
})()';

        // Replace the placeholder with actual block slug
        $content = str_replace('BLOCK_SLUG_PLACEHOLDER', $blockSlug, $content);

        $result = file_put_contents($indexJsPath, $content);

        return $result !== false;
    }
}