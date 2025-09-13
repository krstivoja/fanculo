<?php

namespace Fanculo\Helpers;

class EsbuildAssets
{
    private $buildPath;
    private $buildUrl;

    public function __construct()
    {
        $this->buildPath = plugin_dir_path(__FILE__) . '../../dist/';
        $this->buildUrl = plugin_dir_url(__FILE__) . '../../dist/';
    }

    private function isDevMode()
    {
        $devMarkerFile = $this->buildPath . '.dev-mode';
        return file_exists($devMarkerFile);
    }

    public function enqueueAssets()
    {
        $jsFile = $this->buildPath . 'index.js';
        $cssFile = $this->buildPath . 'index.css';

        // Enqueue CSS
        if (file_exists($cssFile)) {
            wp_enqueue_style(
                'fanculo-app',
                $this->buildUrl . 'index.css',
                array(),
                filemtime($cssFile)
            );
        }

        // Enqueue JavaScript
        if (file_exists($jsFile)) {
            wp_enqueue_script(
                'fanculo-app',
                $this->buildUrl . 'index.js',
                array(),
                filemtime($jsFile),
                true
            );

            // Localize script with REST API data
            wp_localize_script('fanculo-app', 'wpApiSettings', [
                'root' => esc_url_raw(rest_url()),
                'nonce' => wp_create_nonce('wp_rest'),
            ]);

            // Add livereload script in development
            if ($this->isDevMode()) {
                wp_enqueue_script(
                    'fanculo-livereload',
                    'http://localhost:35729/livereload.js',
                    array(),
                    '1.0.0',
                    true
                );
            }
        }
    }
}