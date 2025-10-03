<?php

namespace FanCoolo\Admin\Api\Services;

use FanCoolo\Content\FunculoTypeTaxonomy;
use FanCoolo\Database\BlockSettingsRepository;
use FanCoolo\Database\ScssPartialsSettingsRepository;
use FanCoolo\Database\BlockAttributesRepository;

/**
 * Standardized Bulk Operations Pipeline
 *
 * Provides a consistent 6-step bulk operation process across all API controllers:
 * Step 1: WP_Query for posts
 * Step 2: BulkQueryService->getBulkPostTerms()
 * Step 3: BulkQueryService->getOptimizedMetaKeys()
 * Step 4: BulkQueryService->getBulkPostMeta()
 * Step 5: Repository::getBulk() calls for custom tables
 * Step 6: Data formatting and response building
 */
class StandardBulkPipeline
{
    private $bulkQueryService;

    public function __construct(BulkQueryService $bulkQueryService)
    {
        $this->bulkQueryService = $bulkQueryService;
    }

    /**
     * Execute the complete bulk pipeline for multiple posts
     *
     * @param array $postIds Array of post IDs
     * @param array $options Optional configuration
     * @return BulkPipelineResult
     */
    public function executeBulkPipeline(array $postIds, array $options = []): BulkPipelineResult
    {
        if (empty($postIds)) {
            return new BulkPipelineResult([], [], [], [], [], []);
        }

        $startTime = microtime(true);

        // STEP 2: Fetch all terms at once - eliminates N+1
        $allTerms = $this->bulkQueryService->getBulkPostTerms(
            $postIds,
            $options['taxonomy'] ?? FunculoTypeTaxonomy::getTaxonomy()
        );

        // STEP 3: Get optimized meta keys based on content types
        $optimizedMetaKeys = $this->bulkQueryService->getOptimizedMetaKeys($allTerms);

        // STEP 4: Fetch all meta at once - eliminates N+1
        $allMeta = $this->bulkQueryService->getBulkPostMeta($postIds, $optimizedMetaKeys);

        // STEP 5: Identify content types for repository calls
        $contentTypeIds = $this->categorizePostsByType($postIds, $allTerms);

        // STEP 5: Repository bulk calls for custom tables
        $repositoryData = $this->executeRepositoryBulkCalls($contentTypeIds, $options);

        // Log performance
        $this->bulkQueryService->logPerformance('standardBulkPipeline', count($postIds), $startTime);

        return new BulkPipelineResult(
            $allTerms,
            $allMeta,
            $repositoryData['blockSettings'],
            $repositoryData['scssSettings'],
            $repositoryData['blockAttributes'],
            $contentTypeIds
        );
    }

    /**
     * Execute bulk pipeline for a single post (for consistency)
     *
     * @param int $postId Single post ID
     * @param array $options Optional configuration
     * @return BulkPipelineResult
     */
    public function executeSinglePostPipeline(int $postId, array $options = []): BulkPipelineResult
    {
        return $this->executeBulkPipeline([$postId], $options);
    }

    /**
     * Categorize posts by their content type for efficient repository calls
     *
     * @param array $postIds Array of post IDs
     * @param array $allTerms Terms data from bulk query
     * @return array Categorized post IDs
     */
    private function categorizePostsByType(array $postIds, array $allTerms): array
    {
        $blockPostIds = [];
        $scssPartialIds = [];

        foreach ($postIds as $postId) {
            $postTerms = $allTerms[$postId] ?? [];
            foreach ($postTerms as $term) {
                if ($term['slug'] === FunculoTypeTaxonomy::getTermBlocks()) {
                    $blockPostIds[] = $postId;
                    break;
                } elseif ($term['slug'] === FunculoTypeTaxonomy::getTermScssPartials()) {
                    $scssPartialIds[] = $postId;
                    break;
                }
            }
        }

        return [
            'blocks' => $blockPostIds,
            'scssPartials' => $scssPartialIds,
            'symbols' => [], // Future: add symbol categorization
        ];
    }

    /**
     * Execute all repository bulk calls based on content types
     *
     * @param array $contentTypeIds Categorized post IDs
     * @param array $options Pipeline options
     * @return array Repository data
     */
    private function executeRepositoryBulkCalls(array $contentTypeIds, array $options): array
    {
        $repositoryData = [
            'blockSettings' => [],
            'scssSettings' => [],
            'blockAttributes' => [],
        ];

        // Load block settings if we have blocks
        if (!empty($contentTypeIds['blocks']) && !($options['skipBlockSettings'] ?? false)) {
            $repositoryData['blockSettings'] = BlockSettingsRepository::getBulk($contentTypeIds['blocks']);
        }

        // Load SCSS partial settings if we have SCSS partials
        if (!empty($contentTypeIds['scssPartials']) && !($options['skipScssSettings'] ?? false)) {
            $repositoryData['scssSettings'] = ScssPartialsSettingsRepository::getBulk($contentTypeIds['scssPartials']);
        }

        // Load block attributes if we have blocks (and not disabled)
        if (!empty($contentTypeIds['blocks']) && !($options['skipBlockAttributes'] ?? false)) {
            $repositoryData['blockAttributes'] = BlockAttributesRepository::getBulk($contentTypeIds['blocks']);
        }

        return $repositoryData;
    }

    /**
     * Format post data using the pipeline results
     *
     * @param \WP_Post $post WordPress post object
     * @param BulkPipelineResult $pipelineResult Pipeline execution results
     * @param array $options Formatting options
     * @return array Formatted post data
     */
    public function formatPostData(\WP_Post $post, BulkPipelineResult $pipelineResult, array $options = []): array
    {
        $postId = $post->ID;
        $postTerms = $pipelineResult->allTerms[$postId] ?? [];
        $postMeta = $pipelineResult->allMeta[$postId] ?? [];

        // Format the meta data using BulkQueryService
        $formattedMeta = $this->bulkQueryService->formatPostMeta($postMeta, $postTerms);

        // Apply database settings formatting (for legacy compatibility)
        if ($options['applyDatabaseSettingsFormatting'] ?? false) {
            $formattedMeta = $this->applyDatabaseSettingsFormatting(
                $formattedMeta,
                $postId,
                $pipelineResult
            );
        }

        // Base post data
        $formattedPost = [
            'id' => $postId,
            'title' => $post->post_title,
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'terms' => $postTerms,
            'meta' => $formattedMeta,
        ];

        // Add additional fields if requested
        if ($options['includeEditUrl'] ?? false) {
            $formattedPost['edit_url'] = get_edit_post_link($postId);
        }

        if ($options['includeExcerpt'] ?? false) {
            $formattedPost['excerpt'] = wp_trim_words($post->post_content, $options['excerptLength'] ?? 20);
        }

        if ($options['includeDates'] ?? false) {
            $formattedPost['date'] = $post->post_date;
            $formattedPost['modified'] = $post->post_modified;
        }

        // Add separate structured data (non-legacy format)
        if ($options['includeStructuredData'] ?? false) {
            if (isset($pipelineResult->blockSettings[$postId])) {
                $formattedPost['block_settings'] = $pipelineResult->blockSettings[$postId];
            }

            if (isset($pipelineResult->scssSettings[$postId])) {
                $formattedPost['scss_settings'] = $pipelineResult->scssSettings[$postId];
            }

            if (isset($pipelineResult->blockAttributes[$postId])) {
                $formattedPost['attributes'] = $pipelineResult->blockAttributes[$postId];
            }
        }

        return $formattedPost;
    }

    /**
     * Apply database settings formatting for legacy compatibility
     *
     * @param array $formattedMeta Existing formatted meta
     * @param int $postId Post ID
     * @param BulkPipelineResult $pipelineResult Pipeline results
     * @return array Updated formatted meta
     */
    private function applyDatabaseSettingsFormatting(array $formattedMeta, int $postId, BulkPipelineResult $pipelineResult): array
    {
        // Add block settings if this is a block
        if (isset($pipelineResult->blockSettings[$postId])) {
            $dbSettings = $pipelineResult->blockSettings[$postId];

            // Format settings for frontend compatibility
            $blockSettings = [
                'category' => $dbSettings['category'],
                'description' => $dbSettings['description'],
                'icon' => $dbSettings['icon']
            ];

            // Format inner blocks settings
            $innerBlocksSettings = [
                'enabled' => $dbSettings['supports_inner_blocks'],
                'allowed_blocks' => $dbSettings['allowed_block_types'],
                'template' => $dbSettings['template'],
                'templateLock' => $dbSettings['template_lock']
            ];

            // Add to meta in expected format
            if (!isset($formattedMeta['blocks'])) {
                $formattedMeta['blocks'] = [];
            }
            $formattedMeta['blocks']['settings'] = json_encode($blockSettings);
            $formattedMeta['blocks']['inner_blocks_settings'] = json_encode($innerBlocksSettings);

            $selectedPartials = $dbSettings['selected_partials'] ?? [];
            $editorSelectedPartials = $dbSettings['editor_selected_partials'] ?? [];
            error_log("FanCoolo Debug: StandardBulkPipeline formatPostData - Post ID: $postId, selected_partials from DB: " . json_encode($selectedPartials) . ", editor_selected_partials: " . json_encode($editorSelectedPartials));

            $formattedMeta['blocks']['selected_partials'] = json_encode($selectedPartials);
            $formattedMeta['blocks']['editor_selected_partials'] = json_encode($editorSelectedPartials);

            error_log("FanCoolo Debug: StandardBulkPipeline formatPostData - Final meta blocks: " . json_encode($formattedMeta['blocks']));
        }

        // Add SCSS partial settings if this is a SCSS partial
        if (isset($pipelineResult->scssSettings[$postId])) {
            $scssSettings = $pipelineResult->scssSettings[$postId];
            if (!isset($formattedMeta['scss_partials'])) {
                $formattedMeta['scss_partials'] = [];
            }
            $formattedMeta['scss_partials']['is_global'] = $scssSettings['is_global'] ? '1' : '0';
            $formattedMeta['scss_partials']['global_order'] = (string) $scssSettings['global_order'];
        }

        return $formattedMeta;
    }
}