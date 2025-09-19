<?php

namespace Fanculo\Services;

use Fanculo\FilesManager\Services\InnerBlocksProcessor;

/**
 * Handles InnerBlocks-related WordPress hooks and script enqueuing
 */
class InnerBlocksHooks
{
    public function __construct()
    {
        $this->initHooks();
    }

    private function initHooks(): void
    {
        add_action('enqueue_block_editor_assets', [$this, 'enqueueParserScript']);
    }

    /**
     * Enqueue the InnerBlocks parser script if needed
     */
    public function enqueueParserScript(): void
    {
        InnerBlocksProcessor::enqueueParserScript();
    }
}
