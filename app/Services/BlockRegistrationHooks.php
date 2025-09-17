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
        add_action('admin_enqueue_scripts', [$this, 'enqueueUtilityScripts'], 5);
    }

    public function registerBlocks(): void
    {
        error_log('BlockRegistrationHooks: Starting block registration');
        $this->blockLoader->loadBlocks();
        error_log('BlockRegistrationHooks: Block registration completed');
    }

    public function enqueueUtilityScripts(): void
    {
        // Only load on editor pages
        if (!$this->isEditorPage()) {
            return;
        }

        $script_path = plugin_dir_url(__FILE__) . '../../assets/js/innerblocks-parser.js';
        $script_version = filemtime(plugin_dir_path(__FILE__) . '../../assets/js/innerblocks-parser.js');

        wp_enqueue_script(
            'fanculo-innerblocks-parser',
            $script_path,
            ['wp-blocks', 'wp-block-editor', 'wp-element'],
            $script_version,
            false // Load in head to ensure it's available before blocks
        );

        error_log('BlockRegistrationHooks: Enqueued InnerBlocks parser utility');
    }

    private function isEditorPage(): bool
    {
        global $pagenow;
        return is_admin() &&
               in_array($pagenow, ['post.php', 'post-new.php']) &&
               (!defined('DOING_AJAX') || !DOING_AJAX);
    }
}