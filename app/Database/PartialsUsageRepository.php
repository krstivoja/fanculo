<?php

namespace FanCoolo\Database;

/**
 * Repository for managing SCSS partial usage tracking
 *
 * This junction table enables fast reverse lookups:
 * - Which blocks use a specific partial?
 * - Which partials does a block use?
 *
 * Performance: O(1) indexed queries instead of O(n) loops
 *
 * Note: Does not extend AbstractBulkRepository because this is a junction table,
 * not a post-based repository. Uses custom methods for relationship management.
 */
class PartialsUsageRepository
{
    /**
     * Validate a single post ID
     *
     * @param int $post_id Post ID to validate
     * @return int Validated post ID
     * @throws \InvalidArgumentException When validation fails
     */
    protected static function validatePostId(int $post_id): int
    {
        if ($post_id <= 0) {
            throw new \InvalidArgumentException("Post ID must be a positive integer, got: {$post_id}");
        }
        return $post_id;
    }
    /**
     * Sync a block's partial usage (style and editorStyle separately)
     *
     * @param int $block_id The block post ID
     * @param array $style_partials Array of partial IDs for style SCSS
     * @param array $editorStyle_partials Array of partial IDs for editorStyle SCSS
     * @return bool Success status
     */
    public static function syncBlockPartials(int $block_id, array $style_partials = [], array $editorStyle_partials = []): bool
    {
        global $wpdb;
        $table_name = DatabaseInstaller::getPartialsUsageTableName();
        $block_id = self::validatePostId($block_id);

        // Start transaction for atomic operation
        $wpdb->query('START TRANSACTION');

        try {
            // Delete existing usage for this block
            $deleted = $wpdb->delete($table_name, ['block_id' => $block_id], ['%d']);
            if ($deleted === false) {
                throw new \Exception("Failed to delete existing usage for block {$block_id}");
            }

            // Insert style partials
            foreach ($style_partials as $partial_id) {
                $partial_id = (int) $partial_id;
                if ($partial_id <= 0) continue;

                $inserted = $wpdb->insert(
                    $table_name,
                    [
                        'partial_id' => $partial_id,
                        'block_id' => $block_id,
                        'usage_type' => 'style'
                    ],
                    ['%d', '%d', '%s']
                );

                if ($inserted === false) {
                    throw new \Exception("Failed to insert style partial {$partial_id} for block {$block_id}");
                }
            }

            // Insert editorStyle partials
            foreach ($editorStyle_partials as $partial_id) {
                $partial_id = (int) $partial_id;
                if ($partial_id <= 0) continue;

                $inserted = $wpdb->insert(
                    $table_name,
                    [
                        'partial_id' => $partial_id,
                        'block_id' => $block_id,
                        'usage_type' => 'editorStyle'
                    ],
                    ['%d', '%d', '%s']
                );

                if ($inserted === false) {
                    throw new \Exception("Failed to insert editorStyle partial {$partial_id} for block {$block_id}");
                }
            }

            $wpdb->query('COMMIT');
            return true;

        } catch (\Exception $e) {
            $wpdb->query('ROLLBACK');
            error_log("FanCoolo PartialsUsageRepository syncBlockPartials error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get all blocks using a specific partial (style, editorStyle, or both)
     *
     * @param int $partial_id The partial post ID
     * @param string $usage_type Optional filter: 'style', 'editorStyle', or null for both
     * @return array Array of block IDs
     */
    public static function getBlocksUsingPartial(int $partial_id, ?string $usage_type = null): array
    {
        global $wpdb;
        $table_name = DatabaseInstaller::getPartialsUsageTableName();
        $partial_id = self::validatePostId($partial_id);

        if ($usage_type !== null && !in_array($usage_type, ['style', 'editorStyle'])) {
            error_log("Invalid usage_type: {$usage_type}");
            return [];
        }

        if ($usage_type) {
            $query = $wpdb->prepare(
                "SELECT DISTINCT block_id FROM $table_name WHERE partial_id = %d AND usage_type = %s",
                $partial_id,
                $usage_type
            );
        } else {
            $query = $wpdb->prepare(
                "SELECT DISTINCT block_id FROM $table_name WHERE partial_id = %d",
                $partial_id
            );
        }

        $results = $wpdb->get_col($query);

        if ($wpdb->last_error) {
            error_log("FanCoolo PartialsUsageRepository getBlocksUsingPartial error: " . $wpdb->last_error);
            return [];
        }

        return array_map('intval', $results);
    }

    /**
     * Get all partials used by a specific block
     *
     * @param int $block_id The block post ID
     * @return array Associative array with 'style' and 'editorStyle' keys containing partial IDs
     */
    public static function getPartialsUsedByBlock(int $block_id): array
    {
        global $wpdb;
        $table_name = DatabaseInstaller::getPartialsUsageTableName();
        $block_id = self::validatePostId($block_id);

        $query = $wpdb->prepare(
            "SELECT partial_id, usage_type FROM $table_name WHERE block_id = %d",
            $block_id
        );

        $results = $wpdb->get_results($query, ARRAY_A);

        if ($wpdb->last_error) {
            error_log("FanCoolo PartialsUsageRepository getPartialsUsedByBlock error: " . $wpdb->last_error);
            return ['style' => [], 'editorStyle' => []];
        }

        $partials = ['style' => [], 'editorStyle' => []];

        foreach ($results as $row) {
            $usage_type = $row['usage_type'];
            if (isset($partials[$usage_type])) {
                $partials[$usage_type][] = (int) $row['partial_id'];
            }
        }

        return $partials;
    }

    /**
     * Delete all usage records for a block (when block is deleted)
     *
     * @param int $block_id The block post ID
     * @return bool Success status
     */
    public static function deleteBlockUsage(int $block_id): bool
    {
        global $wpdb;
        $table_name = DatabaseInstaller::getPartialsUsageTableName();
        $block_id = self::validatePostId($block_id);

        $deleted = $wpdb->delete($table_name, ['block_id' => $block_id], ['%d']);

        if ($deleted === false) {
            error_log("FanCoolo PartialsUsageRepository deleteBlockUsage error for block {$block_id}: " . $wpdb->last_error);
            return false;
        }

        return true;
    }

    /**
     * Delete all usage records for a partial (when partial is deleted)
     *
     * @param int $partial_id The partial post ID
     * @return bool Success status
     */
    public static function deletePartialUsage(int $partial_id): bool
    {
        global $wpdb;
        $table_name = DatabaseInstaller::getPartialsUsageTableName();
        $partial_id = self::validatePostId($partial_id);

        $deleted = $wpdb->delete($table_name, ['partial_id' => $partial_id], ['%d']);

        if ($deleted === false) {
            error_log("FanCoolo PartialsUsageRepository deletePartialUsage error for partial {$partial_id}: " . $wpdb->last_error);
            return false;
        }

        return true;
    }

    /**
     * Get usage statistics for a partial
     *
     * @param int $partial_id The partial post ID
     * @return array Stats array with counts
     */
    public static function getPartialUsageStats(int $partial_id): array
    {
        global $wpdb;
        $table_name = DatabaseInstaller::getPartialsUsageTableName();
        $partial_id = self::validatePostId($partial_id);

        $query = $wpdb->prepare(
            "SELECT
                usage_type,
                COUNT(DISTINCT block_id) as block_count
            FROM $table_name
            WHERE partial_id = %d
            GROUP BY usage_type",
            $partial_id
        );

        $results = $wpdb->get_results($query, ARRAY_A);

        if ($wpdb->last_error) {
            error_log("FanCoolo PartialsUsageRepository getPartialUsageStats error: " . $wpdb->last_error);
            return ['style' => 0, 'editorStyle' => 0, 'total' => 0];
        }

        $stats = ['style' => 0, 'editorStyle' => 0, 'total' => 0];

        foreach ($results as $row) {
            $stats[$row['usage_type']] = (int) $row['block_count'];
        }

        $stats['total'] = $stats['style'] + $stats['editorStyle'];

        return $stats;
    }

    /**
     * Migrate existing data from BlockSettingsRepository to populate this table
     * Should be called during database upgrade to version 0.0.1
     *
     * @return int Number of relationships migrated
     */
    public static function migrateFromBlockSettings(): int
    {
        global $wpdb;
        $blocks_table = DatabaseInstaller::getTableName();

        // Get all blocks with selected partials
        $query = "SELECT post_id, selected_partials, editor_selected_partials FROM $blocks_table
                  WHERE selected_partials IS NOT NULL OR editor_selected_partials IS NOT NULL";

        $blocks = $wpdb->get_results($query, ARRAY_A);

        if (empty($blocks)) {
            return 0;
        }

        $migrated_count = 0;

        foreach ($blocks as $block) {
            $block_id = (int) $block['post_id'];
            $style_partials = [];
            $editorStyle_partials = [];

            // Parse style partials
            if (!empty($block['selected_partials'])) {
                $decoded = json_decode($block['selected_partials'], true);
                if (is_array($decoded)) {
                    $style_partials = array_map('intval', $decoded);
                }
            }

            // Parse editorStyle partials
            if (!empty($block['editor_selected_partials'])) {
                $decoded = json_decode($block['editor_selected_partials'], true);
                if (is_array($decoded)) {
                    $editorStyle_partials = array_map('intval', $decoded);
                }
            }

            // Sync to new table
            if (!empty($style_partials) || !empty($editorStyle_partials)) {
                $success = self::syncBlockPartials($block_id, $style_partials, $editorStyle_partials);
                if ($success) {
                    $migrated_count += count($style_partials) + count($editorStyle_partials);
                }
            }
        }

        return $migrated_count;
    }
}
