<?php

namespace Fanculo\FilesManager\Services;

use function glob;
use function file_exists;
use function file_get_contents;
use function json_decode;
use function json_last_error;
use function json_last_error_msg;
use function register_block_type;
use function is_wp_error;
use function error_log;
use function ob_start;
use function ob_get_clean;
use function preg_replace;

class BlockLoader
{
    public function loadBlocks(): void
    {
        if (!defined('FANCULO_BLOCKS_DIR')) {
            error_log('FANCULO_BLOCKS_DIR constant is not defined');
            return;
        }

        $folders = glob(FANCULO_BLOCKS_DIR . '/*', GLOB_ONLYDIR);

        if (empty($folders)) {
            return;
        }

        foreach ($folders as $folder) {
            $this->loadSingleBlock($folder);
        }
    }

    private function loadSingleBlock(string $folder): void
    {
        // Get the block.json file
        $block_json = $folder . '/block.json';
        if (!file_exists($block_json)) {
            return;
        }

        // Read block.json content
        $block_json_content = file_get_contents($block_json);
        if ($block_json_content === false) {
            error_log('BlockLoader: Error reading block.json from ' . $folder);
            return;
        }

        $block_data = json_decode($block_json_content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('BlockLoader: Error parsing block.json from ' . $folder . ': ' . json_last_error_msg());
            return;
        }

        // Check if this is a dynamic block
        $is_dynamic = isset($block_data['render']) && strpos($block_data['render'], '.php') !== false;

        // Register the block with its assets
        $args = [];

        if ($is_dynamic) {
            $args['render_callback'] = function($attributes, $content, $block) use ($folder) {
                return $this->renderDynamicBlock($folder, $attributes, $content, $block);
            };
        }

        $result = register_block_type($block_json, $args);

        if (is_wp_error($result)) {
            error_log('BlockLoader: Error registering block from ' . $folder . ': ' . $result->get_error_message());
        } else {
            error_log('BlockLoader: Successfully registered block from ' . basename($folder));
        }
    }

    private function renderDynamicBlock(string $folder, $attributes, $content, $block): string
    {
        $render_file = $folder . '/render.php';

        if (!file_exists($render_file)) {
            error_log('BlockLoader: Render file not found for block: ' . $folder);
            return '<!-- Render file not found -->';
        }

        // Make sure we have access to WordPress functions
        if (!function_exists('get_the_ID')) {
            return 'WordPress functions not available';
        }

        // Make essential variables available to the render file
        $GLOBALS['attributes'] = $attributes;
        $GLOBALS['content'] = $content;
        $GLOBALS['block'] = $block;

        // Start output buffering
        ob_start();

        // Make variables available to the render file
        $block_attributes = $attributes;
        $block_content = $content;
        $block_instance = $block;

        // Include the render file
        include $render_file;

        // Get the buffered content
        $rendered_output = ob_get_clean();

        // If output is empty, return a message
        if (empty($rendered_output)) {
            return '<!-- Block rendered as empty -->';
        }

        // Always process InnerBlocks for both editor and frontend
        $rendered_output = $this->processInnerBlocks($rendered_output, $content, $block);

        return $rendered_output;
    }

    private function processInnerBlocks(string $rendered_output, $content, $block): string
    {
        // Check if we're in editor context (REST API request)
        $is_editor_context = defined('REST_REQUEST') && REST_REQUEST;

        if ($is_editor_context) {
            // Editor: Replace with placeholder for JavaScript to detect
            $replacement = '<!--FANCULO_INNERBLOCKS_PLACEHOLDER-->';
        } else {
            // Frontend: Replace with actual inner blocks content
            $replacement = $this->getInnerBlocksContent($content, $block);
        }

        // Replace InnerBlocks placeholders with appropriate content (case-insensitive)
        $innerblocks_patterns = [
            '/<innerblocks\s*\/?>/i',           // Self-closing: <innerblocks /> (any case)
            '/<innerblocks><\/innerblocks>/i'   // With closing tag: <innerblocks></innerblocks> (any case)
        ];

        foreach ($innerblocks_patterns as $pattern) {
            $rendered_output = preg_replace($pattern, $replacement, $rendered_output);
        }

        return $rendered_output;
    }

    private function getInnerBlocksContent($content, $block): string
    {
        $inner_blocks_content = '';

        if (!empty($block->inner_blocks)) {
            foreach ($block->inner_blocks as $inner_block) {
                // Convert WP_Block object to array if needed
                if ($inner_block instanceof \WP_Block) {
                    $inner_blocks_content .= $inner_block->render();
                } else {
                    $inner_blocks_content .= render_block($inner_block);
                }
            }
        } else if (!empty($content)) {
            $inner_blocks_content = $content;
        }

        return $inner_blocks_content;
    }
}