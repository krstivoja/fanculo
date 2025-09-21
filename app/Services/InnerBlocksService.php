<?php

namespace Fanculo\Services;

/**
 * Handles InnerBlocks-related WordPress hooks and script enqueuing
 */
class InnerBlocksService
{
    public function __construct()
    {
        $this->initHooks();
    }

    private function initHooks(): void
    {
        add_action('enqueue_block_editor_assets', [$this, 'enqueueParserScript'], 5); // Load early
    }

    /**
     * Enqueue the InnerBlocks parser script if needed
     */
    public function enqueueParserScript(): void
    {
        wp_enqueue_script(
            'fanculo-block-renderer',
            FANCULO_URL . 'assets/js/block-renderer.js',
            ['wp-element', 'wp-block-editor', 'wp-components', 'wp-data'],
            FANCULO_VERSION,
            true
        );
    }
}
