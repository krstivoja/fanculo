<?php

namespace Fanculo\Admin\Content;

use Fanculo\Admin\Content\FunculoPostType;

class FunculoTypeTaxonomy
{
    const TAXONOMY = 'funculo_type';

    const TERM_BLOCKS = 'blocks';
    const TERM_SYMBOLS = 'symbols';
    const TERM_SCSS_PARTIALS = 'scss-partials';

    private $defaultTerms = [
        self::TERM_BLOCKS => [
            'name' => 'Blocks',
            'description' => 'Gutenberg blocks with PHP, SCSS, JS, attributes, and settings'
        ],
        self::TERM_SYMBOLS => [
            'name' => 'Symbols',
            'description' => 'Reusable symbols with PHP functionality'
        ],
        self::TERM_SCSS_PARTIALS => [
            'name' => 'SCSS Partials',
            'description' => 'SCSS partial files for styling'
        ]
    ];

    public function __construct()
    {
        add_action('init', [$this, 'register']);
        add_action('init', [$this, 'insertDefaultTerms'], 20);
    }

    public function register()
    {
        $labels = [
            'name'                       => 'Funculo Types',
            'singular_name'              => 'Funculo Type',
            'menu_name'                  => 'Types',
            'all_items'                  => 'All Types',
            'parent_item'                => 'Parent Type',
            'parent_item_colon'          => 'Parent Type:',
            'new_item_name'              => 'New Type Name',
            'add_new_item'               => 'Add New Type',
            'edit_item'                  => 'Edit Type',
            'update_item'                => 'Update Type',
            'view_item'                  => 'View Type',
            'separate_items_with_commas' => 'Separate types with commas',
            'add_or_remove_items'        => 'Add or remove types',
            'choose_from_most_used'      => 'Choose from the most used',
            'popular_items'              => 'Popular Types',
            'search_items'               => 'Search Types',
            'not_found'                  => 'Not Found',
            'no_terms'                   => 'No types',
            'items_list'                 => 'Types list',
            'items_list_navigation'      => 'Types list navigation',
        ];

        $args = [
            'labels'                     => $labels,
            'hierarchical'               => false,
            'public'                     => true,
            'show_ui'                    => true,
            'show_admin_column'          => true,
            'show_in_nav_menus'          => false,
            'show_tagcloud'              => false,
            'show_in_rest'               => true,
            'rest_base'                  => 'funculo_types',
            'rest_controller_class'      => 'WP_REST_Terms_Controller',
        ];

        register_taxonomy(
            self::TAXONOMY,
            [FunculoPostType::getPostType()],
            $args
        );
    }

    public function insertDefaultTerms()
    {
        foreach ($this->defaultTerms as $slug => $termData) {
            if (!term_exists($slug, self::TAXONOMY)) {
                wp_insert_term(
                    $termData['name'],
                    self::TAXONOMY,
                    [
                        'slug' => $slug,
                        'description' => $termData['description']
                    ]
                );
            }
        }
    }

    public static function getTaxonomy()
    {
        return self::TAXONOMY;
    }

    public static function getTerms()
    {
        return [
            self::TERM_BLOCKS,
            self::TERM_SYMBOLS,
            self::TERM_SCSS_PARTIALS
        ];
    }

    public static function getTermBlocks()
    {
        return self::TERM_BLOCKS;
    }

    public static function getTermSymbols()
    {
        return self::TERM_SYMBOLS;
    }

    public static function getTermScssPartials()
    {
        return self::TERM_SCSS_PARTIALS;
    }
}