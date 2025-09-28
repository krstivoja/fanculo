<?php

namespace Fanculo\Services;

use function add_action;
use function wp_enqueue_script;
use function wp_localize_script;
use function wp_create_nonce;
use function get_current_screen;
use function plugin_dir_url;
use function plugin_dir_path;
use function is_admin;

/**
 * Gutenberg Sync Service for Fanculo Plugin
 *
 * Handles script loading for hot reload functionality in Gutenberg editor and studio
 */
class GutenbergSync
{
    private $plugin_url;
    private $plugin_path;
    private $hot_reload_sync_script_path;
    private $hot_reload_sync_script_url;

    public function __construct()
    {
        $this->plugin_url = plugin_dir_url(dirname(dirname(__FILE__)));
        $this->plugin_path = plugin_dir_path(dirname(dirname(__FILE__)));

        // Set up script paths and URLs - using simple hot reload
        $this->hot_reload_sync_script_path = $this->plugin_path . 'assets/js/simple-hot-reload.js';
        $this->hot_reload_sync_script_url = $this->plugin_url . 'assets/js/simple-hot-reload.js';

        // Load sync script in editor and studio
        add_action('enqueue_block_editor_assets', [$this, 'enqueue_editor_sync_script']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_studio_sync_script']);
    }

    /**
     * Load sync script in Gutenberg editor
     */
    public function enqueue_editor_sync_script()
    {
        if (!$this->is_block_editor()) {
            return;
        }

        if (!file_exists($this->hot_reload_sync_script_path)) {
            return;
        }

        wp_enqueue_script(
            'fanculo-simple-hot-reload-editor',
            $this->hot_reload_sync_script_url,
            ['wp-api-fetch'],
            filemtime($this->hot_reload_sync_script_path),
            true
        );

        // Add nonce for AJAX requests
        wp_localize_script('fanculo-simple-hot-reload-editor', 'fanculoHotReload', [
            'nonce' => wp_create_nonce('fanculo_hot_reload'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url('fanculo/v1/'),
            'isEditor' => true
        ]);
    }

    /**
     * Load sync script in studio
     */
    public function enqueue_studio_sync_script($hook)
    {
        if (!$this->is_studio_page($hook)) {
            return;
        }

        if (!file_exists($this->hot_reload_sync_script_path)) {
            return;
        }

        wp_enqueue_script(
            'fanculo-simple-hot-reload-studio',
            $this->hot_reload_sync_script_url,
            ['wp-api-fetch'],
            filemtime($this->hot_reload_sync_script_path),
            true
        );

        // Add nonce for AJAX requests
        wp_localize_script('fanculo-simple-hot-reload-studio', 'fanculoHotReload', [
            'nonce' => wp_create_nonce('fanculo_hot_reload'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url('fanculo/v1/'),
            'isStudio' => true
        ]);
    }

    /**
     * Check if we're in the block editor
     */
    private function is_block_editor()
    {
        if (!is_admin()) {
            return false;
        }

        $current_screen = get_current_screen();
        if ($current_screen && method_exists($current_screen, 'is_block_editor')) {
            return $current_screen->is_block_editor();
        }

        global $pagenow;
        return in_array($pagenow, ['post.php', 'post-new.php']);
    }

    /**
     * Check if we're on studio page
     */
    private function is_studio_page($hook)
    {
        // Check multiple patterns for Fanculo studio pages
        $patterns = ['fanculo', 'studio', 'block-editor'];

        foreach ($patterns as $pattern) {
            if (strpos($hook, $pattern) !== false) {
                return true;
            }
        }

        // Also check GET parameter
        if (isset($_GET['page']) && strpos($_GET['page'], 'fanculo') !== false) {
            return true;
        }

        return false;
    }
}