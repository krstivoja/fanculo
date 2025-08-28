<?php

namespace Fanculo\Core;

/**
 * Post Type Registration
 * 
 * Registers the fanculo custom post type and its taxonomies.
 */
class PostType
{
    public function __construct()
    {
        add_action('init', [$this, 'register_post_type']);
        add_action('init', [$this, 'register_taxonomy']);
        add_action('init', [$this, 'create_default_terms']);
    }

    public function register_post_type(): void
    {
        $labels = [
            'name' => 'Fanculo',
            'singular_name' => 'Fanculo',
            'menu_name' => 'Fanculo',
            'add_new' => 'Add New',
            'add_new_item' => 'Add New Fanculo',
            'edit_item' => 'Edit Fanculo',
            'new_item' => 'New Fanculo',
            'view_item' => 'View Fanculo',
            'search_items' => 'Search Fanculo',
            'not_found' => 'No fanculo found',
            'not_found_in_trash' => 'No fanculo found in trash',
        ];

        $args = [
            'labels' => $labels,
            'public' => true,
            'has_archive' => true,
            'publicly_queryable' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'show_in_rest' => true, // Enable Gutenberg
            'supports' => ['title'],
            'menu_icon' => 'dashicons-admin-generic',
            'menu_position' => 20,
            'rewrite' => ['slug' => 'fanculo'],
        ];

        register_post_type('fanculo', $args);
    }

    public function register_taxonomy(): void
    {
        $labels = [
            'name' => 'Types',
            'singular_name' => 'Type',
            'menu_name' => 'Types',
            'all_items' => 'All Types',
            'edit_item' => 'Edit Type',
            'view_item' => 'View Type',
            'update_item' => 'Update Type',
            'add_new_item' => 'Add New Type',
            'new_item_name' => 'New Type Name',
            'search_items' => 'Search Types',
            'not_found' => 'No types found',
        ];

        $args = [
            'labels' => $labels,
            'public' => true,
            'hierarchical' => true, // Like categories
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_rest' => true, // Enable in Gutenberg
            'rewrite' => ['slug' => 'fanculo-type'],
        ];

        register_taxonomy('fanculo_type', ['fanculo'], $args);
    }

    public function create_default_terms(): void
    {
        // Only create terms if they don't exist
        $terms = ['blocks', 'symbols', 'scss'];
        
        foreach ($terms as $term) {
            if (!term_exists($term, 'fanculo_type')) {
                wp_insert_term($term, 'fanculo_type', [
                    'slug' => $term,
                ]);
            }
        }
    }
}