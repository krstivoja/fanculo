<?php

namespace FanCoolo\Services;

use FanCoolo\FilesManager\Services\InnerBlocksProcessor;
use function add_action;

/**
 * Handles InnerBlocks-related WordPress hooks and script enqueuing
 */
class InnerBlocksService
{
    private ScriptLoader $loader;

    public function __construct()
    {
        $this->loader = new ScriptLoader();
        add_action('enqueue_block_editor_assets', [$this, 'enqueueParserScript'], 5); // Load early
    }

    /**
     * Enqueue the InnerBlocks parser script if needed
     */
    public function enqueueParserScript(): void
    {
        $this->loader->enqueueBlockRenderer();

        // Enqueue the old parser only if needed for InnerBlocks
        InnerBlocksProcessor::enqueueParserScript();
    }
}
