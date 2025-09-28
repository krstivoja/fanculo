<?php

namespace Fanculo\Database;

/**
 * Repository for managing SCSS partials settings in the database
 */
class ScssPartialsSettingsRepository
{
    /**
     * Get SCSS partial settings by post ID
     */
    public static function get(int $post_id): ?array
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getScssPartialsTableName();
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE post_id = %d",
            $post_id
        ), ARRAY_A);

        if (!$row) {
            return null;
        }

        // Convert boolean field to actual boolean
        $row['is_global'] = (bool) $row['is_global'];
        // Ensure global_order is integer
        $row['global_order'] = (int) $row['global_order'];

        return $row;
    }

    /**
     * Save or update SCSS partial settings
     */
    public static function save(int $post_id, array $settings): bool
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getScssPartialsTableName();

        // Prepare data for saving
        $data = [
            'post_id' => $post_id,
            'is_global' => isset($settings['is_global']) ? (int) $settings['is_global'] : 0,
            'global_order' => isset($settings['global_order']) ? (int) $settings['global_order'] : 1,
        ];

        // Check if record exists
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE post_id = %d",
            $post_id
        ));

        if ($exists) {
            // Update existing record
            $data['updated_at'] = current_time('mysql');
            $result = $wpdb->update(
                $table_name,
                $data,
                ['post_id' => $post_id]
            );
        } else {
            // Insert new record
            $data['created_at'] = current_time('mysql');
            $data['updated_at'] = current_time('mysql');
            $result = $wpdb->insert($table_name, $data);
        }

        if ($result === false) {
            return false;
        }

        return true;
    }

    /**
     * Delete SCSS partial settings
     */
    public static function delete(int $post_id): bool
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getScssPartialsTableName();
        $result = $wpdb->delete(
            $table_name,
            ['post_id' => $post_id]
        );

        return $result !== false;
    }

    /**
     * Get all SCSS partial settings
     */
    public static function getAll(): array
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getScssPartialsTableName();
        $rows = $wpdb->get_results(
            "SELECT * FROM $table_name ORDER BY global_order ASC, post_id ASC",
            ARRAY_A
        );

        // Process each row
        foreach ($rows as &$row) {
            // Convert boolean field
            $row['is_global'] = (bool) $row['is_global'];
            // Ensure global_order is integer
            $row['global_order'] = (int) $row['global_order'];
        }

        return $rows;
    }

    /**
     * Get all global SCSS partials ordered by global_order
     */
    public static function getGlobalPartials(): array
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getScssPartialsTableName();
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE is_global = %d ORDER BY global_order ASC",
            1
        ), ARRAY_A);

        // Process each row
        foreach ($rows as &$row) {
            // Convert boolean field
            $row['is_global'] = (bool) $row['is_global'];
            // Ensure global_order is integer
            $row['global_order'] = (int) $row['global_order'];
        }

        return $rows;
    }

    /**
     * Bulk get settings for multiple post IDs
     */
    public static function getBulk(array $post_ids): array
    {
        if (empty($post_ids)) {
            return [];
        }

        global $wpdb;
        $table_name = DatabaseInstaller::getScssPartialsTableName();

        // Sanitize post IDs
        $post_ids = array_map('absint', $post_ids);
        $post_ids = array_filter($post_ids);

        if (empty($post_ids)) {
            return [];
        }

        // Build placeholders
        $placeholders = implode(',', array_fill(0, count($post_ids), '%d'));

        // Get all settings for these post IDs
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE post_id IN ($placeholders)",
            $post_ids
        ), ARRAY_A);

        // Group by post_id and process
        $settings_by_post = [];
        foreach ($results as $row) {
            $row['is_global'] = (bool) $row['is_global'];
            $row['global_order'] = (int) $row['global_order'];
            $settings_by_post[$row['post_id']] = $row;
        }

        return $settings_by_post;
    }

    /**
     * Migrate settings from post meta to database table
     */
    public static function migrateFromPostMeta(int $post_id): bool
    {
        // Get existing post meta
        $is_global = get_post_meta($post_id, '_funculo_scss_is_global', true);
        $global_order = get_post_meta($post_id, '_funculo_scss_global_order', true);

        $settings = [];

        // Process is_global
        if ($is_global !== '') {
            $settings['is_global'] = ($is_global === '1' || $is_global === 1 || $is_global === true);
        } else {
            $settings['is_global'] = false;
        }

        // Process global_order
        if ($global_order !== '') {
            $settings['global_order'] = (int) $global_order;
        } else {
            $settings['global_order'] = 1;
        }

        // Save to database
        $result = self::save($post_id, $settings);

        // If successful, optionally delete the old meta
        if ($result) {
            // delete_post_meta($post_id, '_funculo_scss_is_global');
            // delete_post_meta($post_id, '_funculo_scss_global_order');
        }

        return $result;
    }

    /**
     * Migrate all SCSS partials from post meta
     */
    public static function migrateAll(): int
    {
        global $wpdb;

        // Get all posts that are SCSS partials
        $query = new \WP_Query([
            'post_type' => 'fanculo',
            'posts_per_page' => -1,
            'tax_query' => [
                [
                    'taxonomy' => 'fanculo-type',
                    'field' => 'slug',
                    'terms' => 'scss-partials',
                ],
            ],
            'fields' => 'ids',
        ]);

        $migrated = 0;
        foreach ($query->posts as $post_id) {
            if (self::migrateFromPostMeta($post_id)) {
                $migrated++;
            }
        }

        return $migrated;
    }
}