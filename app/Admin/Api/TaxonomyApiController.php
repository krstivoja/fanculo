<?php

namespace Fanculo\Admin\Api;

use Fanculo\Content\FunculoTypeTaxonomy;

class TaxonomyApiController
{
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes()
    {
        // Taxonomy routes
        register_rest_route('funculo/v1', '/taxonomy-terms', [
            'methods' => 'GET',
            'callback' => [$this, 'getTaxonomyTerms'],
            'permission_callback' => [$this, 'checkPermissions'],
        ]);
    }

    public function checkPermissions()
    {
        return current_user_can('edit_posts');
    }

    public function getTaxonomyTerms($request)
    {
        $terms = get_terms([
            'taxonomy' => FunculoTypeTaxonomy::getTaxonomy(),
            'hide_empty' => false,
        ]);

        $termData = [];
        foreach ($terms as $term) {
            $termData[] = [
                'id' => $term->term_id,
                'slug' => $term->slug,
                'name' => $term->name,
                'description' => $term->description,
                'count' => $term->count,
            ];
        }

        return new \WP_REST_Response([
            'terms' => $termData,
        ], 200);
    }
}