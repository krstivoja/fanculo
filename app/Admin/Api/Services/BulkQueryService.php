<?php

namespace Fanculo\Admin\Api\Services;

use Fanculo\Content\FunculoTypeTaxonomy;

/**
 * Bulk Query Service for eliminating N+1 database queries
 *
 * This service provides methods to fetch large amounts of data in single queries
 * instead of multiple individual queries in loops.
 */
class BulkQueryService
{
    /**
     * Bulk fetch post terms for multiple posts
     * Eliminates N+1 queries when getting terms for multiple posts
     *
     * @param array $postIds Array of post IDs
     * @param string $taxonomy Taxonomy name
     * @return array Associative array with post_id => terms
     */
    public function getBulkPostTerms(array $postIds, string $taxonomy): array
    {
        if (empty($postIds)) {
            return [];
        }

        // Use wp_get_object_terms with object IDs to get all terms at once
        $allTerms = wp_get_object_terms($postIds, $taxonomy, [
            'fields' => 'all_with_object_id'
        ]);

        if (is_wp_error($allTerms)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('BulkQueryService: Error fetching bulk terms: ' . $allTerms->get_error_message());
            }
            return [];
        }

        // Group terms by post ID
        $termsByPost = [];
        foreach ($allTerms as $term) {
            $termsByPost[$term->object_id][] = [
                'id' => $term->term_id,
                'slug' => $term->slug,
                'name' => $term->name,
            ];
        }

        // Ensure all post IDs have an entry (even if empty)
        foreach ($postIds as $postId) {
            if (!isset($termsByPost[$postId])) {
                $termsByPost[$postId] = [];
            }
        }

        return $termsByPost;
    }

    /**
     * Bulk fetch post meta for multiple posts and multiple meta keys
     * Eliminates N+1 queries when getting meta for multiple posts
     *
     * @param array $postIds Array of post IDs
     * @param array $metaKeys Array of meta keys to fetch
     * @return array Associative array with post_id => [meta_key => meta_value]
     */
    public function getBulkPostMeta(array $postIds, array $metaKeys): array
    {
        if (empty($postIds) || empty($metaKeys)) {
            return [];
        }

        global $wpdb;

        // Sanitize input arrays
        $postIds = array_map('absint', $postIds);
        $metaKeys = array_map('sanitize_key', $metaKeys);

        // Remove any invalid values
        $postIds = array_filter($postIds);
        $metaKeys = array_filter($metaKeys);

        if (empty($postIds) || empty($metaKeys)) {
            return [];
        }

        // Build placeholders safely
        $postIdPlaceholders = implode(',', array_fill(0, count($postIds), '%d'));
        $metaKeyPlaceholders = implode(',', array_fill(0, count($metaKeys), '%s'));

        // Build the complete SQL with placeholders
        $sql = "SELECT post_id, meta_key, meta_value
                FROM {$wpdb->postmeta}
                WHERE post_id IN ({$postIdPlaceholders})
                AND meta_key IN ({$metaKeyPlaceholders})";

        // Prepare query with all parameters
        $queryParams = array_merge($postIds, $metaKeys);
        $preparedQuery = $wpdb->prepare($sql, $queryParams);

        $results = $wpdb->get_results($preparedQuery);

        // Group meta by post ID and key
        $metaByPost = [];
        foreach ($results as $row) {
            $metaByPost[$row->post_id][$row->meta_key] = maybe_unserialize($row->meta_value);
        }

        // Ensure all post IDs have an entry with all requested keys
        foreach ($postIds as $postId) {
            if (!isset($metaByPost[$postId])) {
                $metaByPost[$postId] = [];
            }
            foreach ($metaKeys as $metaKey) {
                if (!isset($metaByPost[$postId][$metaKey])) {
                    $metaByPost[$postId][$metaKey] = '';
                }
            }
        }

        return $metaByPost;
    }

    /**
     * Format post meta based on terms for a specific post
     * Groups meta data by content type (blocks, symbols, scss_partials)
     *
     * @param array $postMeta All meta data for the post
     * @param array $postTerms All terms for the post
     * @return array Formatted meta data grouped by content type
     */
    public function formatPostMeta(array $postMeta, array $postTerms): array
    {
        $formattedMeta = [];

        foreach ($postTerms as $term) {
            switch ($term['slug']) {
                case FunculoTypeTaxonomy::getTermBlocks():
                    $formattedMeta['blocks'] = [
                        'php' => $postMeta[MetaKeysConstants::BLOCK_PHP] ?? '',
                        'scss' => $postMeta[MetaKeysConstants::BLOCK_SCSS] ?? '',
                        'js' => $postMeta[MetaKeysConstants::BLOCK_JS] ?? '',
                        'attributes' => $postMeta[MetaKeysConstants::BLOCK_ATTRIBUTES] ?? '',
                        'settings' => $postMeta[MetaKeysConstants::BLOCK_SETTINGS] ?? '',
                        'selected_partials' => $postMeta[MetaKeysConstants::BLOCK_SELECTED_PARTIALS] ?? '',
                    ];
                    break;

                case FunculoTypeTaxonomy::getTermSymbols():
                    $formattedMeta['symbols'] = [
                        'php' => $postMeta[MetaKeysConstants::SYMBOL_PHP] ?? '',
                    ];
                    break;

                case FunculoTypeTaxonomy::getTermScssPartials():
                    $formattedMeta['scss_partials'] = [
                        'scss' => $postMeta[MetaKeysConstants::SCSS_PARTIAL_SCSS] ?? '',
                    ];
                    break;
            }
        }

        return $formattedMeta;
    }

    /**
     * Get all meta keys that might be needed for posts
     * Based on the content types that exist in the system
     *
     * @return array All possible meta keys
     */
    public function getAllPossibleMetaKeys(): array
    {
        return [
            // Block meta keys
            MetaKeysConstants::BLOCK_PHP,
            MetaKeysConstants::BLOCK_SCSS,
            MetaKeysConstants::BLOCK_JS,
            MetaKeysConstants::BLOCK_ATTRIBUTES,
            MetaKeysConstants::BLOCK_SETTINGS,
            MetaKeysConstants::BLOCK_SELECTED_PARTIALS,

            // Symbol meta keys
            MetaKeysConstants::SYMBOL_PHP,

            // SCSS partial meta keys
            MetaKeysConstants::SCSS_PARTIAL_SCSS,

            // SCSS compilation meta keys (sometimes needed)
            MetaKeysConstants::SCSS_CONTENT,
            MetaKeysConstants::CSS_CONTENT,
            MetaKeysConstants::CSS_COMPILED_AT,
            MetaKeysConstants::SCSS_IS_GLOBAL,
            MetaKeysConstants::SCSS_GLOBAL_ORDER,
        ];
    }

    /**
     * Smart meta key selection based on post terms
     * Only fetches meta keys that are actually needed for the given terms
     *
     * @param array $allTerms All terms grouped by post ID
     * @return array Optimized list of meta keys to fetch
     */
    public function getOptimizedMetaKeys(array $allTerms): array
    {
        $neededKeys = [];
        $hasBlocks = false;
        $hasSymbols = false;
        $hasScssPartials = false;

        // Analyze what content types we have
        foreach ($allTerms as $postTerms) {
            foreach ($postTerms as $term) {
                switch ($term['slug']) {
                    case FunculoTypeTaxonomy::getTermBlocks():
                        $hasBlocks = true;
                        break;
                    case FunculoTypeTaxonomy::getTermSymbols():
                        $hasSymbols = true;
                        break;
                    case FunculoTypeTaxonomy::getTermScssPartials():
                        $hasScssPartials = true;
                        break;
                }
            }
        }

        // Only add keys for content types that exist
        if ($hasBlocks) {
            $neededKeys = array_merge($neededKeys, [
                MetaKeysConstants::BLOCK_PHP,
                MetaKeysConstants::BLOCK_SCSS,
                MetaKeysConstants::BLOCK_JS,
                MetaKeysConstants::BLOCK_ATTRIBUTES,
                MetaKeysConstants::BLOCK_SETTINGS,
                MetaKeysConstants::BLOCK_SELECTED_PARTIALS,
            ]);
        }

        if ($hasSymbols) {
            $neededKeys[] = MetaKeysConstants::SYMBOL_PHP;
        }

        if ($hasScssPartials) {
            $neededKeys = array_merge($neededKeys, [
                MetaKeysConstants::SCSS_PARTIAL_SCSS,
                MetaKeysConstants::SCSS_IS_GLOBAL,
                MetaKeysConstants::SCSS_GLOBAL_ORDER,
            ]);
        }

        return array_unique($neededKeys);
    }

    /**
     * Performance monitoring helper
     * Logs query count and timing information
     *
     * @param string $operation Operation name
     * @param int $postCount Number of posts processed
     * @param float $startTime Start time from microtime(true)
     */
    public function logPerformance(string $operation, int $postCount, float $startTime): void
    {
        $endTime = microtime(true);
        $duration = round(($endTime - $startTime) * 1000, 2); // Convert to milliseconds

        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                'BulkQueryService: %s completed - %d posts processed in %s ms (avg: %s ms/post)',
                $operation,
                $postCount,
                $duration,
                $postCount > 0 ? round($duration / $postCount, 2) : 0
            ));
        }
    }
}