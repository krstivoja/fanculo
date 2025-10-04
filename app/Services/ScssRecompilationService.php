<?php

namespace FanCoolo\Services;

use FanCoolo\Database\PartialsUsageRepository;
use FanCoolo\Database\BlockSettingsRepository;
use FanCoolo\Admin\Api\Services\MetaKeysConstants;
use FanCoolo\Services\ErrorLogger;

/**
 * SCSS Recompilation Service
 *
 * Handles bidirectional SCSS compilation:
 * When an SCSS partial is updated, recompile all blocks that use it
 */
class ScssRecompilationService
{
    /**
     * Recompile all blocks using a specific partial
     *
     * @param int $partialId The partial post ID
     * @return array Results of recompilation
     */
    public static function recompileBlocksUsingPartial(int $partialId): array
    {
        try {
            // Get all blocks using this partial (both style and editorStyle)
            $styleBlocks = PartialsUsageRepository::getBlocksUsingPartial($partialId, 'style');
            $editorStyleBlocks = PartialsUsageRepository::getBlocksUsingPartial($partialId, 'editorStyle');

            // Merge and get unique block IDs
            $allBlockIds = array_unique(array_merge($styleBlocks, $editorStyleBlocks));

            if (empty($allBlockIds)) {
                return [
                    'success' => true,
                    'blocks_affected' => 0,
                    'message' => 'No blocks use this partial'
                ];
            }

            // Build compilation data for all affected blocks
            $compilations = self::buildCompilationData($allBlockIds);

            if (empty($compilations)) {
                return [
                    'success' => true,
                    'blocks_affected' => 0,
                    'message' => 'No blocks have SCSS content to compile'
                ];
            }

            // Trigger batch compilation
            $result = self::triggerBatchCompilation($partialId, $compilations);

            return [
                'success' => true,
                'blocks_affected' => count($allBlockIds),
                'compilations_triggered' => count($compilations),
                'compilation_result' => $result
            ];

        } catch (\Exception $e) {
            ErrorLogger::log("Recompilation failed for partial $partialId", 'ScssRecompilationService', $e);
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Build compilation data for blocks
     *
     * @param array $blockIds Array of block post IDs
     * @return array Array of compilation payloads
     */
    private static function buildCompilationData(array $blockIds): array
    {
        $compilations = [];

        foreach ($blockIds as $blockId) {
            // Verify block exists
            $block = get_post($blockId);
            if (!$block || $block->post_status !== 'publish') {
                continue;
            }

            // Get block's SCSS content
            $scssContent = get_post_meta($blockId, MetaKeysConstants::BLOCK_SCSS, true);
            $editorScssContent = get_post_meta($blockId, MetaKeysConstants::BLOCK_EDITOR_SCSS, true);

            // Only add to compilation queue if block has SCSS content
            $compilation = [
                'post_id' => $blockId,
            ];

            // Add frontend SCSS if it exists
            if (!empty($scssContent)) {
                $compilation['scss_content'] = $scssContent;
            }

            // Add editor SCSS if it exists
            if (!empty($editorScssContent)) {
                $compilation['editor_scss_content'] = $editorScssContent;
            }

            // Only add if there's something to compile
            if (isset($compilation['scss_content']) || isset($compilation['editor_scss_content'])) {
                $compilations[] = $compilation;
            }
        }

        return $compilations;
    }

    /**
     * Trigger batch compilation by clearing compiled CSS and marking for recompilation
     *
     * Since we use the browser-based JS SCSS compiler, we can't compile on the server.
     * Instead, we clear existing compiled CSS and mark blocks for frontend recompilation.
     *
     * @param array $compilations Array of compilation payloads
     * @return array Compilation result
     */
    private static function triggerBatchCompilation(int $partialId, array $compilations)
    {
        $results = [];
        $timestamp = current_time('mysql');
        $blocksMarkedForFrontend = [];

        foreach ($compilations as $compilation) {
            $postId = $compilation['post_id'];

            try {
                $hasScss = isset($compilation['scss_content']) && !empty($compilation['scss_content']);
                $hasEditorScss = isset($compilation['editor_scss_content']) && !empty($compilation['editor_scss_content']);

                // Clear compiled CSS to force recompilation on frontend
                if ($hasScss) {
                    delete_post_meta($postId, MetaKeysConstants::CSS_CONTENT);
                }

                if ($hasEditorScss) {
                    delete_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT);
                }

                // Set recompile flag and timestamp for frontend detection
                if ($hasScss || $hasEditorScss) {
                    update_post_meta($postId, '_funculo_scss_needs_recompile', '1');
                    update_post_meta($postId, '_funculo_scss_recompile_timestamp', $timestamp);

                    // Invalidate cache for this post to ensure fresh data is returned
                    self::invalidatePostCache($postId);

                    $blocksMarkedForFrontend[] = $postId;
                }

                $results[] = [
                    'post_id' => $postId,
                    'success' => true,
                    'scss_cleared' => $hasScss,
                    'editor_scss_cleared' => $hasEditorScss,
                    'message' => 'CSS cleared, marked for recompilation'
                ];

            } catch (\Exception $e) {
                ErrorLogger::log("Error marking block $postId for recompilation", 'ScssRecompilationService', $e);
                $results[] = [
                    'post_id' => $postId,
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        if (!empty($blocksMarkedForFrontend)) {
            self::markBlocksForFrontendRecompile($partialId, $blocksMarkedForFrontend);
        }

        return $results;
    }

    /**
     * Persist information for the frontend polling service so it can recompile blocks
     */
    private static function markBlocksForFrontendRecompile(int $partialId, array $blockIds): void
    {
        $uniqueIds = array_values(array_unique(array_map('intval', $blockIds)));

        if (empty($uniqueIds)) {
            return;
        }

        $payload = [
            'partial_id' => $partialId,
            'block_ids' => $uniqueIds,
            'timestamp' => time(),
        ];

        set_transient('fancoolo_blocks_need_recompile', $payload, 5 * MINUTE_IN_SECONDS);
    }

    /**
     * Invalidate all cache entries for a post
     *
     * @param int $postId Post ID to invalidate cache for
     */
    private static function invalidatePostCache(int $postId): void
    {
        // Clear WordPress object cache
        if (function_exists('wp_cache_delete')) {
            wp_cache_delete($postId, 'posts');
            wp_cache_delete($postId, 'post_meta');
        }

        // Clear transient-based cache (API cache)
        $cachePrefix = 'fancoolo_api_';
        $cachePatterns = [
            "{$cachePrefix}post_{$postId}_*",
            "{$cachePrefix}batch_*",
            "{$cachePrefix}post_with_related_{$postId}",
        ];

        // Delete common transients
        delete_transient("{$cachePrefix}post_{$postId}_full");
        delete_transient("{$cachePrefix}post_{$postId}_meta");
        delete_transient("{$cachePrefix}post_{$postId}_with_related");

        // Clear tracking
        delete_transient("post_cache_keys_{$postId}");
    }
}
