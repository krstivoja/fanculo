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

use Fanculo\FilesManager\Services\InnerBlocksProcessor;

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

        // Use the InnerBlocks processor service
        $rendered_output = InnerBlocksProcessor::processTemplate($render_file, $attributes, $content, $block);

        // If output is empty, return a message
        if (empty($rendered_output)) {
            return '<!-- Block rendered as empty -->';
        }

        return $rendered_output;
    }

}