<?php

namespace Fanculo\Helpers;

class AdminAssets
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

        // Enqueue JavaScript as ES module
        if (file_exists($jsFile)) {
            // Get posts data for immediate rendering
            $posts_data = $this->getPostsData();

            // Output data as inline script before the module
            wp_add_inline_script('jquery', 'window.wpApiSettings = ' . json_encode([
                'root' => esc_url_raw(rest_url()),
                'nonce' => wp_create_nonce('wp_rest'),
                'posts' => $posts_data,
            ]), 'after');

            // Add the module script manually in footer
            add_action('admin_print_footer_scripts', [$this, 'outputModuleScript']);
        }
    }

    private function getPostsData()
    {
        $posts = get_posts([
            'post_type' => 'funculo',
            'numberposts' => 100,
            'post_status' => 'any',
            'meta_query' => [],
        ]);

        $grouped = [
            'blocks' => [],
            'symbols' => [],
            'scss-partials' => []
        ];

        foreach ($posts as $post) {
            $terms = wp_get_post_terms($post->ID, 'funculo_type');

            if (!empty($terms) && !is_wp_error($terms)) {
                $term_slug = $terms[0]->slug;

                if (isset($grouped[$term_slug])) {
                    $grouped[$term_slug][] = [
                        'id' => $post->ID,
                        'title' => [
                            'rendered' => get_the_title($post)
                        ]
                    ];
                }
            }
        }

        return $grouped;
    }

    public function outputModuleScript()
    {
        $jsFile = $this->buildPath . 'index.js';
        if (file_exists($jsFile)) {
            echo '<script type="module" src="' . esc_url($this->buildUrl . 'index.js') . '?ver=' . filemtime($jsFile) . '"></script>' . "\n";
        }
    }
}