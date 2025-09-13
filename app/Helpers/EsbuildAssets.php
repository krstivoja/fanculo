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
        $jsFile = $this->buildPath . 'main.js';

        if (file_exists($jsFile)) {
            wp_enqueue_script(
                'fanculo-app',
                $this->buildUrl . 'main.js',
                array(),
                filemtime($jsFile),
                true
            );

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