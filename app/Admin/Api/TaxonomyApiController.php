<?php

namespace Fanculo\Admin\Api;

use Fanculo\Content\FunculoTypeTaxonomy;

class TaxonomyApiController
{
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