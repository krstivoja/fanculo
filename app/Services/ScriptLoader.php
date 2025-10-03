<?php

namespace FanCoolo\Services;

use function admin_url;
use function file_exists;
use function filemtime;
use function plugin_dir_url;
use function rest_url;
use function wp_create_nonce;
use function wp_enqueue_script;
use function wp_localize_script;

class ScriptLoader
{
    public const HOT_RELOAD_HANDLE = 'fancoolo-hot-reload';
    public const HOT_RELOAD_FILE = 'assets/js/hot-reload.js';
    public const BLOCK_RENDERER_HANDLE = 'fancoolo-block-renderer';
    public const BLOCK_RENDERER_FILE = 'assets/js/block-renderer.js';

    private $pluginFile;

    public function __construct()
    {
        $this->pluginFile = defined('FANCOOLO_PLUGIN_FILE') ? FANCOOLO_PLUGIN_FILE : dirname(__DIR__, 2) . '/fanculo.php';
    }

    public function enqueueHotReload(): void
    {
        $path = $this->getPath(self::HOT_RELOAD_FILE);
        if (!file_exists($path)) {
            return;
        }

        wp_enqueue_script(
            self::HOT_RELOAD_HANDLE,
            $this->getUrl(self::HOT_RELOAD_FILE),
            ['wp-api-fetch'],
            filemtime($path),
            true
        );

        wp_localize_script(self::HOT_RELOAD_HANDLE, 'fancooloHotReload', [
            'nonce' => wp_create_nonce('fancoolo_hot_reload'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url('fancoolo/v1/'),
        ]);
    }

    public function enqueueBlockRenderer(): void
    {
        $path = $this->getPath(self::BLOCK_RENDERER_FILE);
        if (!file_exists($path)) {
            return;
        }

        wp_enqueue_script(
            self::BLOCK_RENDERER_HANDLE,
            $this->getUrl(self::BLOCK_RENDERER_FILE),
            ['wp-element', 'wp-block-editor', 'wp-components', 'wp-data'],
            filemtime($path),
            true
        );
    }

    private function getPath(string $relative): string
    {
        return dirname($this->pluginFile) . '/' . $relative;
    }

    private function getUrl(string $relative): string
    {
        return plugin_dir_url($this->pluginFile) . $relative;
    }
}
