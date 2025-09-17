<?php

namespace Fanculo\Admin\Api\Services;

use Fanculo\Admin\Content\FunculoPostType;

/**
 * Meta Keys Migration Service
 *
 * Handles migration of legacy meta keys to standardized format.
 * Ensures data integrity during the transition.
 */
class MetaKeysMigration
{
    private $logPrefix = 'MetaKeysMigration:';

    /**
     * Run the complete meta keys migration
     *
     * @return array Migration results with statistics
     */
    public function runMigration(): array
    {
        error_log("{$this->logPrefix} Starting meta keys migration");

        $results = [
            'success' => false,
            'migrated_posts' => 0,
            'migrated_keys' => 0,
            'errors' => [],
            'legacy_keys_found' => [],
            'migration_details' => []
        ];

        try {
            // Get all posts that might have legacy meta keys
            $posts = $this->getPostsWithLegacyMeta();
            error_log("{$this->logPrefix} Found " . count($posts) . " posts to check for migration");

            $legacyMapping = MetaKeysConstants::getLegacyMapping();

            foreach ($posts as $post) {
                $postResults = $this->migratePostMetaKeys($post->ID, $legacyMapping);

                if ($postResults['migrated_count'] > 0) {
                    $results['migrated_posts']++;
                    $results['migrated_keys'] += $postResults['migrated_count'];
                    $results['migration_details'][$post->ID] = $postResults;

                    error_log("{$this->logPrefix} Migrated {$postResults['migrated_count']} keys for post {$post->ID} ({$post->post_title})");
                }

                if (!empty($postResults['errors'])) {
                    $results['errors'] = array_merge($results['errors'], $postResults['errors']);
                }

                if (!empty($postResults['legacy_keys'])) {
                    $results['legacy_keys_found'] = array_merge($results['legacy_keys_found'], $postResults['legacy_keys']);
                }
            }

            $results['success'] = empty($results['errors']);

            error_log("{$this->logPrefix} Migration completed. Posts: {$results['migrated_posts']}, Keys: {$results['migrated_keys']}, Errors: " . count($results['errors']));

        } catch (\Exception $e) {
            $error = "Migration failed: " . $e->getMessage();
            $results['errors'][] = $error;
            error_log("{$this->logPrefix} {$error}");
        }

        return $results;
    }

    /**
     * Migrate meta keys for a specific post
     *
     * @param int $postId The post ID to migrate
     * @param array $legacyMapping Legacy to new key mapping
     * @return array Migration results for this post
     */
    private function migratePostMetaKeys(int $postId, array $legacyMapping): array
    {
        $results = [
            'migrated_count' => 0,
            'legacy_keys' => [],
            'errors' => []
        ];

        foreach ($legacyMapping as $legacyKey => $newKey) {
            try {
                // Check if legacy key exists
                $legacyValue = get_post_meta($postId, $legacyKey, true);

                if (!empty($legacyValue)) {
                    $results['legacy_keys'][] = $legacyKey;

                    // Check if new key already exists
                    $newValue = get_post_meta($postId, $newKey, true);

                    if (empty($newValue)) {
                        // Migrate: copy legacy value to new key
                        $updated = update_post_meta($postId, $newKey, $legacyValue);

                        if ($updated) {
                            // Remove legacy key after successful migration
                            delete_post_meta($postId, $legacyKey);
                            $results['migrated_count']++;

                            error_log("{$this->logPrefix} Migrated {$legacyKey} -> {$newKey} for post {$postId}");
                        } else {
                            $results['errors'][] = "Failed to update {$newKey} for post {$postId}";
                        }
                    } else {
                        // New key exists - compare values
                        if ($legacyValue === $newValue) {
                            // Values match - safe to remove legacy key
                            delete_post_meta($postId, $legacyKey);
                            error_log("{$this->logPrefix} Removed duplicate legacy key {$legacyKey} for post {$postId}");
                        } else {
                            // Values differ - manual intervention needed
                            $results['errors'][] = "Conflict: {$legacyKey} and {$newKey} have different values for post {$postId}";
                        }
                    }
                }
            } catch (\Exception $e) {
                $results['errors'][] = "Error migrating {$legacyKey} for post {$postId}: " . $e->getMessage();
            }
        }

        return $results;
    }

    /**
     * Get all Funculo posts that might have legacy meta keys
     *
     * @return array Array of WP_Post objects
     */
    private function getPostsWithLegacyMeta(): array
    {
        global $wpdb;

        $postType = FunculoPostType::getPostType();
        $legacyKeys = array_keys(MetaKeysConstants::getLegacyMapping());

        // Build query to find posts with any legacy meta keys
        $placeholders = implode(',', array_fill(0, count($legacyKeys), '%s'));

        $query = $wpdb->prepare("
            SELECT DISTINCT p.ID, p.post_title
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = %s
            AND pm.meta_key IN ({$placeholders})
            ORDER BY p.ID
        ", array_merge([$postType], $legacyKeys));

        $results = $wpdb->get_results($query);

        return $results ?: [];
    }

    /**
     * Get a preview of what would be migrated (dry run)
     *
     * @return array Preview results without making changes
     */
    public function previewMigration(): array
    {
        error_log("{$this->logPrefix} Running migration preview (dry run)");

        $results = [
            'posts_to_migrate' => 0,
            'legacy_keys_found' => [],
            'migration_plan' => []
        ];

        $posts = $this->getPostsWithLegacyMeta();
        $legacyMapping = MetaKeysConstants::getLegacyMapping();

        foreach ($posts as $post) {
            $postPlan = [
                'post_id' => $post->ID,
                'post_title' => $post->post_title,
                'migrations' => []
            ];

            foreach ($legacyMapping as $legacyKey => $newKey) {
                $legacyValue = get_post_meta($post->ID, $legacyKey, true);

                if (!empty($legacyValue)) {
                    $results['legacy_keys_found'][] = $legacyKey;

                    $postPlan['migrations'][] = [
                        'from' => $legacyKey,
                        'to' => $newKey,
                        'value_length' => strlen($legacyValue),
                        'existing_new_key' => !empty(get_post_meta($post->ID, $newKey, true))
                    ];
                }
            }

            if (!empty($postPlan['migrations'])) {
                $results['migration_plan'][] = $postPlan;
                $results['posts_to_migrate']++;
            }
        }

        $results['legacy_keys_found'] = array_unique($results['legacy_keys_found']);

        error_log("{$this->logPrefix} Preview complete. Posts to migrate: {$results['posts_to_migrate']}");

        return $results;
    }

    /**
     * Verify migration integrity after completion
     *
     * @return array Verification results
     */
    public function verifyMigration(): array
    {
        error_log("{$this->logPrefix} Verifying migration integrity");

        $results = [
            'success' => true,
            'remaining_legacy_keys' => [],
            'missing_data' => [],
            'posts_checked' => 0
        ];

        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'numberposts' => -1
        ]);

        $legacyKeys = array_keys(MetaKeysConstants::getLegacyMapping());

        foreach ($posts as $post) {
            $results['posts_checked']++;

            // Check for remaining legacy keys
            foreach ($legacyKeys as $legacyKey) {
                $legacyValue = get_post_meta($post->ID, $legacyKey, true);
                if (!empty($legacyValue)) {
                    $results['remaining_legacy_keys'][] = [
                        'post_id' => $post->ID,
                        'key' => $legacyKey,
                        'value_length' => strlen($legacyValue)
                    ];
                    $results['success'] = false;
                }
            }
        }

        error_log("{$this->logPrefix} Verification complete. Success: " . ($results['success'] ? 'Yes' : 'No'));

        return $results;
    }

    /**
     * Rollback migration (restore legacy keys from new keys)
     * USE WITH CAUTION - for emergency rollback only
     *
     * @return array Rollback results
     */
    public function rollbackMigration(): array
    {
        error_log("{$this->logPrefix} WARNING: Starting migration rollback");

        $results = [
            'success' => false,
            'rolled_back_posts' => 0,
            'rolled_back_keys' => 0,
            'errors' => []
        ];

        $posts = get_posts([
            'post_type' => FunculoPostType::getPostType(),
            'post_status' => 'any',
            'numberposts' => -1
        ]);

        $legacyMapping = MetaKeysConstants::getLegacyMapping();

        foreach ($posts as $post) {
            $postRollbacks = 0;

            foreach ($legacyMapping as $legacyKey => $newKey) {
                try {
                    $newValue = get_post_meta($post->ID, $newKey, true);

                    if (!empty($newValue)) {
                        // Restore legacy key
                        update_post_meta($post->ID, $legacyKey, $newValue);
                        $postRollbacks++;
                        $results['rolled_back_keys']++;
                    }
                } catch (\Exception $e) {
                    $results['errors'][] = "Error rolling back {$newKey} for post {$post->ID}: " . $e->getMessage();
                }
            }

            if ($postRollbacks > 0) {
                $results['rolled_back_posts']++;
            }
        }

        $results['success'] = empty($results['errors']);

        error_log("{$this->logPrefix} Rollback complete. Posts: {$results['rolled_back_posts']}, Keys: {$results['rolled_back_keys']}");

        return $results;
    }
}