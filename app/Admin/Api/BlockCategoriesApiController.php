<?php

namespace Fanculo\Admin\Api;

class BlockCategoriesApiController
{
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes()
    {
        // Block categories routes
        register_rest_route('funculo/v1', '/block-categories', [
            'methods' => 'GET',
            'callback' => [$this, 'getBlockCategories'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);
    }

    public function checkPermissions()
    {
        return current_user_can('edit_posts');
    }

    public function getBlockCategories()
    {
        // Simple test response first
        $test_categories = [
            ['value' => 'text', 'label' => 'Text'],
            ['value' => 'media', 'label' => 'Media'],
            ['value' => 'design', 'label' => 'Design'],
            ['value' => 'widgets', 'label' => 'Widgets'],
            ['value' => 'theme', 'label' => 'Theme'],
            ['value' => 'embed', 'label' => 'Embeds']
        ];

        error_log('Returning test categories: ' . print_r($test_categories, true));

        return rest_ensure_response($test_categories);
    }

    private function formatCategoryTitle($slug)
    {
        // Handle common category name mappings
        $titles = [
            'text' => 'Text',
            'media' => 'Media',
            'design' => 'Design',
            'widgets' => 'Widgets',
            'theme' => 'Theme',
            'embed' => 'Embeds',
            'reusable' => 'Reusable Blocks',
            'formatting' => 'Formatting',
            'layout' => 'Layout Elements',
            'common' => 'Common Blocks'
        ];

        return isset($titles[$slug]) ? $titles[$slug] : ucwords(str_replace(['-', '_'], ' ', $slug));
    }
}