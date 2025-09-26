<?php

namespace Fanculo\Database;

/**
 * Repository for managing block settings in the database
 */
class BlockSettingsRepository
{
    /**
     * Get block settings by post ID
     */
    public static function get(int $post_id): ?array
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getTableName();
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE post_id = %d",
            $post_id
        ), ARRAY_A);

        if (!$row) {
            return null;
        }

        // Convert allowed_block_types from comma-separated to array
        if (!empty($row['allowed_block_types'])) {
            $row['allowed_block_types'] = explode(',', $row['allowed_block_types']);
        } else {
            $row['allowed_block_types'] = [];
        }

        // Convert template from comma-separated to array
        if (!empty($row['template'])) {
            $row['template'] = explode(',', $row['template']);
        } else {
            $row['template'] = [];
        }

        // Convert boolean fields to actual booleans
        $row['supports_inner_blocks'] = (bool) $row['supports_inner_blocks'];

        return $row;
    }

    /**
     * Save or update block settings
     */
    public static function save(int $post_id, array $settings): bool
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getTableName();

        // Prepare data for saving
        $data = [
            'post_id' => $post_id,
            'category' => $settings['category'] ?? null,
            'description' => $settings['description'] ?? null,
            'icon' => $settings['icon'] ?? null,
            'supports_inner_blocks' => isset($settings['supports_inner_blocks']) ? (int) $settings['supports_inner_blocks'] : 0,
            'template_lock' => $settings['template_lock'] ?? null,
        ];

        // Handle allowed_block_types - convert array to comma-separated string
        if (isset($settings['allowed_block_types'])) {
            if (is_array($settings['allowed_block_types'])) {
                $data['allowed_block_types'] = implode(',', array_filter($settings['allowed_block_types']));
            } else {
                $data['allowed_block_types'] = $settings['allowed_block_types'];
            }
        } else {
            $data['allowed_block_types'] = null;
        }

        // Handle template - convert array to comma-separated string
        if (isset($settings['template'])) {
            if (is_array($settings['template'])) {
                $data['template'] = implode(',', array_filter($settings['template']));
            } else {
                $data['template'] = $settings['template'];
            }
        } else {
            $data['template'] = null;
        }

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
            error_log('Fanculo: Failed to save block settings - ' . $wpdb->last_error);
            return false;
        }

        return true;
    }

    /**
     * Delete block settings
     */
    public static function delete(int $post_id): bool
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getTableName();
        $result = $wpdb->delete(
            $table_name,
            ['post_id' => $post_id]
        );

        return $result !== false;
    }

    /**
     * Get all block settings
     */
    public static function getAll(): array
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getTableName();
        $rows = $wpdb->get_results(
            "SELECT * FROM $table_name ORDER BY post_id",
            ARRAY_A
        );

        // Process each row
        foreach ($rows as &$row) {
            // Convert allowed_block_types from comma-separated to array
            if (!empty($row['allowed_block_types'])) {
                $row['allowed_block_types'] = explode(',', $row['allowed_block_types']);
            } else {
                $row['allowed_block_types'] = [];
            }

            // Convert template from comma-separated to array
            if (!empty($row['template'])) {
                $row['template'] = explode(',', $row['template']);
            } else {
                $row['template'] = [];
            }

            // Convert boolean fields
            $row['supports_inner_blocks'] = (bool) $row['supports_inner_blocks'];
        }

        return $rows;
    }

    /**
     * Migrate settings from post meta to database table
     */
    public static function migrateFromPostMeta(int $post_id): bool
    {
        // Get existing post meta
        $block_settings = get_post_meta($post_id, '_funculo_block_settings', true);
        $inner_blocks_settings = get_post_meta($post_id, '_funculo_block_inner_blocks_settings', true);

        $settings = [];

        // Parse block settings JSON
        if (!empty($block_settings)) {
            $block_data = is_string($block_settings) ? json_decode($block_settings, true) : $block_settings;
            if ($block_data) {
                $settings['category'] = $block_data['category'] ?? null;
                $settings['description'] = $block_data['description'] ?? null;
            }
        }

        // Parse inner blocks settings JSON
        if (!empty($inner_blocks_settings)) {
            $inner_data = is_string($inner_blocks_settings) ? json_decode($inner_blocks_settings, true) : $inner_blocks_settings;
            if ($inner_data) {
                $settings['supports_inner_blocks'] = !empty($inner_data['supportsInnerBlocks']);
                $settings['allowed_block_types'] = $inner_data['allowedBlocks'] ?? [];
                $settings['default_block_type'] = $inner_data['defaultBlock'] ?? null;
                $settings['lock_template'] = !empty($inner_data['lockTemplate']);
            }
        }

        // Save to database if we have any settings
        if (!empty($settings)) {
            return self::save($post_id, $settings);
        }

        return true;
    }
}