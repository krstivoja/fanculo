<?php

namespace Fanculo\Admin\Api;

class BlockCategoriesApiController
{
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