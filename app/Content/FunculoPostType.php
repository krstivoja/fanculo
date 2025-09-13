<?php

namespace Fanculo\Content;

class FunculoPostType
{
    const POST_TYPE = 'funculo';

    public function __construct()
    {
        add_action('init', [$this, 'register']);
    }

    public function register()
    {
        $labels = [
            'name'                  => 'Funculos',
            'singular_name'         => 'Funculo',
            'menu_name'             => 'Funculos',
            'name_admin_bar'        => 'Funculo',
            'archives'              => 'Funculo Archives',
            'attributes'            => 'Funculo Attributes',
            'parent_item_colon'     => 'Parent Funculo:',
            'all_items'             => 'All Funculos',
            'add_new_item'          => 'Add New Funculo',
            'add_new'               => 'Add New',
            'new_item'              => 'New Funculo',
            'edit_item'             => 'Edit Funculo',
            'update_item'           => 'Update Funculo',
            'view_item'             => 'View Funculo',
            'view_items'            => 'View Funculos',
            'search_items'          => 'Search Funculos',
            'not_found'             => 'Not found',
            'not_found_in_trash'    => 'Not found in Trash',
            'featured_image'        => 'Featured Image',
            'set_featured_image'    => 'Set featured image',
            'remove_featured_image' => 'Remove featured image',
            'use_featured_image'    => 'Use as featured image',
            'insert_into_item'      => 'Insert into Funculo',
            'uploaded_to_this_item' => 'Uploaded to this Funculo',
            'items_list'            => 'Funculos list',
            'items_list_navigation' => 'Funculos list navigation',
            'filter_items_list'     => 'Filter Funculos list',
        ];

        $args = [
            'label'                 => 'Funculo',
            'description'           => 'Custom post type for Funculo components',
            'labels'                => $labels,
            'supports'              => ['title'],
            'taxonomies'            => ['funculo_type'],
            'hierarchical'          => false,
            'public'                => true,
            'show_ui'               => true,
            'show_in_menu'          => true,
            'menu_position'         => 25,
            'menu_icon'             => 'dashicons-code-standards',
            'show_in_admin_bar'     => true,
            'show_in_nav_menus'     => false,
            'can_export'            => true,
            'has_archive'           => false,
            'exclude_from_search'   => true,
            'publicly_queryable'    => false,
            'capability_type'       => 'post',
            'show_in_rest'          => true,
            'rest_base'             => 'funculos',
            'rest_controller_class' => 'WP_REST_Posts_Controller',
        ];

        register_post_type(self::POST_TYPE, $args);
    }

    public static function getPostType()
    {
        return self::POST_TYPE;
    }
}