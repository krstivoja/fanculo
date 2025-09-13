<?php

namespace Fanculo\Helpers;

use Fanculo\PostTypes\FunculoPostType;
use Fanculo\Taxonomies\FunculoTypeTaxonomy;
use Fanculo\MetaBoxes\BlocksMetaBoxes;
use Fanculo\MetaBoxes\SymbolsMetaBoxes;
use Fanculo\MetaBoxes\SCSSPartialsMetaBoxes;

class MetaBoxHelper
{
    private $metaBoxInstances = [];

    public function __construct()
    {
        add_action('add_meta_boxes', [$this, 'conditionallyAddMetaBoxes'], 5);
        add_action('admin_enqueue_scripts', [$this, 'enqueueAdminAssets']);
    }

    public function conditionallyAddMetaBoxes()
    {
        global $post;

        if (!$post || $post->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        // Get the current taxonomy terms
        $terms = wp_get_post_terms($post->ID, FunculoTypeTaxonomy::getTaxonomy(), ['fields' => 'slugs']);

        if (empty($terms)) {
            // No terms selected, don't show any meta boxes
            return;
        }

        // Initialize meta boxes based on selected terms
        foreach ($terms as $termSlug) {
            switch ($termSlug) {
                case FunculoTypeTaxonomy::getTermBlocks():
                    if (!isset($this->metaBoxInstances['blocks'])) {
                        $this->metaBoxInstances['blocks'] = new BlocksMetaBoxes();
                    }
                    break;

                case FunculoTypeTaxonomy::getTermSymbols():
                    if (!isset($this->metaBoxInstances['symbols'])) {
                        $this->metaBoxInstances['symbols'] = new SymbolsMetaBoxes();
                    }
                    break;

                case FunculoTypeTaxonomy::getTermScssPartials():
                    if (!isset($this->metaBoxInstances['scss_partials'])) {
                        $this->metaBoxInstances['scss_partials'] = new SCSSPartialsMetaBoxes();
                    }
                    break;
            }
        }
    }

    public function enqueueAdminAssets($hook)
    {
        global $post;

        // Only load on Funculo post edit screens
        if (!in_array($hook, ['post.php', 'post-new.php']) ||
            !$post ||
            $post->post_type !== FunculoPostType::getPostType()) {
            return;
        }

        // Enqueue admin JavaScript for dynamic meta box loading
        wp_enqueue_script(
            'funculo-admin-js',
            plugin_dir_url(__FILE__) . '../../Assets/admin-scripts.js',
            ['jquery'],
            '1.0.0',
            true
        );

        // Localize script with AJAX data
        wp_localize_script('funculo-admin-js', 'funculoAdmin', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('funculo_admin_nonce'),
            'postId' => $post->ID ?? 0,
            'taxonomy' => FunculoTypeTaxonomy::getTaxonomy(),
            'terms' => [
                'blocks' => FunculoTypeTaxonomy::getTermBlocks(),
                'symbols' => FunculoTypeTaxonomy::getTermSymbols(),
                'scssPartials' => FunculoTypeTaxonomy::getTermScssPartials(),
            ]
        ]);

        // Enqueue admin styles
        wp_enqueue_style(
            'funculo-admin-css',
            plugin_dir_url(__FILE__) . '../../Assets/admin-styles.css',
            [],
            '1.0.0'
        );
    }

    public static function getPostTerms($postId)
    {
        return wp_get_post_terms($postId, FunculoTypeTaxonomy::getTaxonomy(), ['fields' => 'slugs']);
    }

    public static function hasTermBlocks($postId)
    {
        $terms = self::getPostTerms($postId);
        return in_array(FunculoTypeTaxonomy::getTermBlocks(), $terms);
    }

    public static function hasTermSymbols($postId)
    {
        $terms = self::getPostTerms($postId);
        return in_array(FunculoTypeTaxonomy::getTermSymbols(), $terms);
    }

    public static function hasTermScssPartials($postId)
    {
        $terms = self::getPostTerms($postId);
        return in_array(FunculoTypeTaxonomy::getTermScssPartials(), $terms);
    }
}