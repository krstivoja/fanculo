<?php

namespace Fanculo\Admin\Api;

use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Admin\Api\Services\ApiResponseFormatter;

class TaxonomyApiController
{
    private $responseFormatter;
    public function __construct()
    {
        $this->responseFormatter = new ApiResponseFormatter();
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

        return $this->responseFormatter->collection(
            $termData,
            ['total' => count($termData)]
        );
    }
}
