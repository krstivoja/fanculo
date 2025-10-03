<?php

namespace Fanculo\Services;

use Fanculo\Database\PartialsUsageRepository;
use Fanculo\Database\BlockSettingsRepository;
use Fanculo\Admin\Api\Services\MetaKeysConstants;

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
            error_log("🔄 [ScssRecompilationService] ========================================");
            error_log("🔄 [ScssRecompilationService] Starting recompilation for partial $partialId");

            // Get partial info for logging
            $partial = get_post($partialId);
            $partialTitle = $partial ? $partial->post_title : 'Unknown';
            error_log("🔄 [ScssRecompilationService] Partial title: $partialTitle");

            // Get all blocks using this partial (both style and editorStyle)
            $styleBlocks = PartialsUsageRepository::getBlocksUsingPartial($partialId, 'style');
            $editorStyleBlocks = PartialsUsageRepository::getBlocksUsingPartial($partialId, 'editorStyle');

            error_log("📊 [ScssRecompilationService] Blocks using partial in STYLE: " . json_encode($styleBlocks));
            error_log("📊 [ScssRecompilationService] Blocks using partial in EDITOR_STYLE: " . json_encode($editorStyleBlocks));

            // Merge and get unique block IDs
            $allBlockIds = array_unique(array_merge($styleBlocks, $editorStyleBlocks));

            if (empty($allBlockIds)) {
                error_log("ℹ️ [ScssRecompilationService] No blocks using partial $partialId");
                error_log("🔄 [ScssRecompilationService] ========================================");
                return [
                    'success' => true,
                    'blocks_affected' => 0,
                    'message' => 'No blocks use this partial'
                ];
            }

            error_log("📦 [ScssRecompilationService] Found " . count($allBlockIds) . " unique blocks using partial $partialId: " . json_encode($allBlockIds));

            // Build compilation data for all affected blocks
            $compilations = self::buildCompilationData($allBlockIds);

            error_log("🔨 [ScssRecompilationService] Built " . count($compilations) . " compilation payloads");

            if (empty($compilations)) {
                error_log("⚠️ [ScssRecompilationService] No compilation data built for blocks");
                error_log("🔄 [ScssRecompilationService] ========================================");
                return [
                    'success' => true,
                    'blocks_affected' => 0,
                    'message' => 'No blocks have SCSS content to compile'
                ];
            }

            // Trigger batch compilation
            $result = self::triggerBatchCompilation($partialId, $compilations);

            error_log("✅ [ScssRecompilationService] Recompilation complete. Summary: " . json_encode([
                'blocks_affected' => count($allBlockIds),
                'compilations_triggered' => count($compilations)
            ]));
            error_log("🔄 [ScssRecompilationService] ========================================");

            return [
                'success' => true,
                'blocks_affected' => count($allBlockIds),
                'compilations_triggered' => count($compilations),
                'compilation_result' => $result
            ];

        } catch (\Exception $e) {
            error_log("❌ [ScssRecompilationService] Error: " . $e->getMessage());
            error_log("🔄 [ScssRecompilationService] ========================================");
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
                error_log("⚠️ [ScssRecompilationService] Skipping block $blockId - not found or not published");
                continue;
            }

            $blockTitle = $block->post_title;
            error_log("📝 [ScssRecompilationService] Processing block $blockId: $blockTitle");

            // Get block's SCSS content
            $scssContent = get_post_meta($blockId, MetaKeysConstants::BLOCK_SCSS, true);
            $editorScssContent = get_post_meta($blockId, MetaKeysConstants::BLOCK_EDITOR_SCSS, true);

            error_log("   → Has SCSS content: " . (!empty($scssContent) ? 'YES' : 'NO'));
            error_log("   → Has Editor SCSS content: " . (!empty($editorScssContent) ? 'YES' : 'NO'));

            // Only add to compilation queue if block has SCSS content
            $compilation = [
                'post_id' => $blockId,
            ];

            // Add frontend SCSS if it exists
            if (!empty($scssContent)) {
                $compilation['scss_content'] = $scssContent;
                error_log("   → Added to compilation queue (style)");
            }

            // Add editor SCSS if it exists
            if (!empty($editorScssContent)) {
                $compilation['editor_scss_content'] = $editorScssContent;
                error_log("   → Added to compilation queue (editorStyle)");
            }

            // Only add if there's something to compile
            if (isset($compilation['scss_content']) || isset($compilation['editor_scss_content'])) {
                $compilations[] = $compilation;
            } else {
                error_log("   → Skipped - no SCSS content to compile");
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

        error_log("🔧 [ScssRecompilationService] Triggering batch compilation for " . count($compilations) . " blocks");

        foreach ($compilations as $compilation) {
            $postId = $compilation['post_id'];

            try {
                $hasScss = isset($compilation['scss_content']) && !empty($compilation['scss_content']);
                $hasEditorScss = isset($compilation['editor_scss_content']) && !empty($compilation['editor_scss_content']);

                $block = get_post($postId);
                $blockTitle = $block ? $block->post_title : "Block $postId";

                error_log("🎯 [ScssRecompilationService] Processing: $blockTitle (ID: $postId)");

                // Get current CSS before clearing
                $currentCss = get_post_meta($postId, MetaKeysConstants::CSS_CONTENT, true);
                $currentEditorCss = get_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT, true);

                error_log("   → Current CSS exists: " . (!empty($currentCss) ? 'YES' : 'NO'));
                error_log("   → Current Editor CSS exists: " . (!empty($currentEditorCss) ? 'YES' : 'NO'));

                // Clear compiled CSS to force recompilation on frontend
                if ($hasScss) {
                    delete_post_meta($postId, MetaKeysConstants::CSS_CONTENT);
                    error_log("   → Cleared CSS_CONTENT meta");
                }

                if ($hasEditorScss) {
                    delete_post_meta($postId, MetaKeysConstants::BLOCK_EDITOR_CSS_CONTENT);
                    error_log("   → Cleared BLOCK_EDITOR_CSS_CONTENT meta");
                }

                // Set recompile flag and timestamp for frontend detection
                if ($hasScss || $hasEditorScss) {
                    update_post_meta($postId, '_funculo_scss_needs_recompile', '1');
                    update_post_meta($postId, '_funculo_scss_recompile_timestamp', $timestamp);
                    error_log("   → Set recompile flag: _funculo_scss_needs_recompile = 1");
                    error_log("   → Set timestamp: $timestamp");

                    // Invalidate cache for this post to ensure fresh data is returned
                    self::invalidatePostCache($postId);
                    error_log("   → Cache invalidated for post $postId");

                    $blocksMarkedForFrontend[] = $postId;
                }

                $results[] = [
                    'post_id' => $postId,
                    'success' => true,
                    'scss_cleared' => $hasScss,
                    'editor_scss_cleared' => $hasEditorScss,
                    'message' => 'CSS cleared, marked for recompilation'
                ];

                error_log("✅ [ScssRecompilationService] Successfully processed block $postId");

            } catch (\Exception $e) {
                error_log("❌ [ScssRecompilationService] Error marking block $postId: " . $e->getMessage());
                error_log("❌ [ScssRecompilationService] Stack trace: " . $e->getTraceAsString());
                $results[] = [
                    'post_id' => $postId,
                    'success' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        if (!empty($blocksMarkedForFrontend)) {
            self::markBlocksForFrontendRecompile($partialId, $blocksMarkedForFrontend);
        } else {
            error_log("ℹ️ [ScssRecompilationService] No blocks marked for frontend recompilation – transient not set");
        }

        error_log("📊 [ScssRecompilationService] Batch complete. Results summary: " . json_encode([
            'total' => count($results),
            'successful' => count(array_filter($results, fn($r) => $r['success'])),
            'failed' => count(array_filter($results, fn($r) => !$r['success']))
        ]));

        return $results;
    }

    /**
     * Persist information for the frontend polling service so it can recompile blocks
     */
    private static function markBlocksForFrontendRecompile(int $partialId, array $blockIds): void
    {
        $uniqueIds = array_values(array_unique(array_map('intval', $blockIds)));

        if (empty($uniqueIds)) {
            error_log("ℹ️ [ScssRecompilationService] markBlocksForFrontendRecompile called with empty block list");
            return;
        }

        $payload = [
            'partial_id' => $partialId,
            'block_ids' => $uniqueIds,
            'timestamp' => time(),
        ];

        set_transient('fanculo_blocks_need_recompile', $payload, 5 * MINUTE_IN_SECONDS);

        error_log("📬 [ScssRecompilationService] Stored blocks needing recompilation in transient: " . json_encode([
            'partial_id' => $partialId,
            'block_ids' => $uniqueIds,
        ]));
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
        $cachePrefix = 'fanculo_api_';
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
