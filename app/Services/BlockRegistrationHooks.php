<?php

namespace Fanculo\Services;

use Fanculo\FilesManager\Services\BlockLoader;

class BlockRegistrationHooks
{
    private $blockLoader;

    public function __construct()
    {
        $this->blockLoader = new BlockLoader();
        $this->init();
    }

    private function init(): void
    {
        add_action('init', [$this, 'registerBlocks'], 20);
    }

    public function registerBlocks(): void
    {
        error_log('BlockRegistrationHooks: Starting block registration');
        $this->blockLoader->loadBlocks();
        error_log('BlockRegistrationHooks: Block registration completed');
    }
}