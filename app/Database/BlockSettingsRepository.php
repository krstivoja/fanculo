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

        // Convert selected_partials from JSON to array
        if (!empty($row['selected_partials'])) {
            $row['selected_partials'] = json_decode($row['selected_partials'], true) ?: [];
        } else {
            $row['selected_partials'] = [];
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

        // Check if record exists
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE post_id = %d",
            $post_id
        ));

        // If updating, get existing data first to preserve fields not being updated
        $existingData = [];
        if ($exists) {
            $existingData = self::get($post_id);
            if (!$existingData) {
                $existingData = [];
            }
        }

        // Prepare data for saving - only include fields that are present in settings
        $data = ['post_id' => $post_id];

        // Only update fields that are present in the settings array
        if (array_key_exists('category', $settings)) {
            $data['category'] = $settings['category'];
        } elseif ($exists && isset($existingData['category'])) {
            $data['category'] = $existingData['category'];
        }

        if (array_key_exists('description', $settings)) {
            $data['description'] = $settings['description'];
        } elseif ($exists && isset($existingData['description'])) {
            $data['description'] = $existingData['description'];
        }

        if (array_key_exists('icon', $settings)) {
            $data['icon'] = $settings['icon'];
        } elseif ($exists && isset($existingData['icon'])) {
            $data['icon'] = $existingData['icon'];
        }

        if (array_key_exists('supports_inner_blocks', $settings)) {
            $data['supports_inner_blocks'] = (int) $settings['supports_inner_blocks'];
        } elseif ($exists && isset($existingData['supports_inner_blocks'])) {
            $data['supports_inner_blocks'] = (int) $existingData['supports_inner_blocks'];
        }

        if (array_key_exists('template_lock', $settings)) {
            $data['template_lock'] = $settings['template_lock'];
        } elseif ($exists && isset($existingData['template_lock'])) {
            $data['template_lock'] = $existingData['template_lock'];
        }

        // Handle allowed_block_types - convert array to comma-separated string
        if (array_key_exists('allowed_block_types', $settings)) {
            if (is_array($settings['allowed_block_types'])) {
                $data['allowed_block_types'] = implode(',', array_filter($settings['allowed_block_types']));
            } else {
                $data['allowed_block_types'] = $settings['allowed_block_types'];
            }
        } elseif ($exists && isset($existingData['allowed_block_types'])) {
            if (is_array($existingData['allowed_block_types'])) {
                $data['allowed_block_types'] = implode(',', array_filter($existingData['allowed_block_types']));
            } else {
                $data['allowed_block_types'] = $existingData['allowed_block_types'];
            }
        }

        // Handle template - convert array to comma-separated string
        if (array_key_exists('template', $settings)) {
            if (is_array($settings['template'])) {
                $data['template'] = implode(',', array_filter($settings['template']));
            } else {
                $data['template'] = $settings['template'];
            }
        } elseif ($exists && isset($existingData['template'])) {
            if (is_array($existingData['template'])) {
                $data['template'] = implode(',', array_filter($existingData['template']));
            } else {
                $data['template'] = $existingData['template'];
            }
        }

        // Handle selected_partials - convert array to JSON string
        if (array_key_exists('selected_partials', $settings)) {
            if (is_array($settings['selected_partials'])) {
                $data['selected_partials'] = json_encode(array_values(array_filter($settings['selected_partials'])));
            } else if (is_string($settings['selected_partials'])) {
                // If it's already a JSON string, validate and store it
                $decoded = json_decode($settings['selected_partials'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $data['selected_partials'] = $settings['selected_partials'];
                } else {
                    $data['selected_partials'] = '[]';
                }
            } else {
                $data['selected_partials'] = '[]';
            }
        } elseif ($exists && isset($existingData['selected_partials'])) {
            if (is_array($existingData['selected_partials'])) {
                $data['selected_partials'] = json_encode(array_values($existingData['selected_partials']));
            } else {
                $data['selected_partials'] = '[]';
            }
        }

        if ($exists) {
            // Update existing record
            $data['updated_at'] = current_time('mysql');
            $result = $wpdb->update(
                $table_name,
                $data,
                ['post_id' => $post_id]
            );
        } else {
            // Insert new record - set defaults for fields not provided
            $data['created_at'] = current_time('mysql');
            $data['updated_at'] = current_time('mysql');

            // Set defaults for fields not provided in new records
            if (!isset($data['category'])) $data['category'] = null;
            if (!isset($data['description'])) $data['description'] = null;
            if (!isset($data['icon'])) $data['icon'] = null;
            if (!isset($data['supports_inner_blocks'])) $data['supports_inner_blocks'] = 0;
            if (!isset($data['allowed_block_types'])) $data['allowed_block_types'] = null;
            if (!isset($data['template'])) $data['template'] = null;
            if (!isset($data['template_lock'])) $data['template_lock'] = null;
            if (!isset($data['selected_partials'])) $data['selected_partials'] = null;

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

            // Convert selected_partials from JSON to array
            if (!empty($row['selected_partials'])) {
                $row['selected_partials'] = json_decode($row['selected_partials'], true) ?: [];
            } else {
                $row['selected_partials'] = [];
            }

            // Convert boolean fields
            $row['supports_inner_blocks'] = (bool) $row['supports_inner_blocks'];
        }

        return $rows;
    }

    /**
     * Get all blocks that use a specific partial
     */
    public static function getBlocksUsingPartial(int $partial_id): array
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getTableName();

        // Use JSON_CONTAINS to find blocks with this partial ID
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name
            WHERE JSON_CONTAINS(selected_partials, %s, '$')",
            json_encode($partial_id)
        ), ARRAY_A);

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

            // Convert selected_partials from JSON to array
            if (!empty($row['selected_partials'])) {
                $row['selected_partials'] = json_decode($row['selected_partials'], true) ?: [];
            } else {
                $row['selected_partials'] = [];
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