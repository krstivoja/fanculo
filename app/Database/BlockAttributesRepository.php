<?php

namespace Fanculo\Database;

use Fanculo\Admin\Api\Services\MetaKeysConstants;

/**
 * Repository for managing block attributes in the database
 */
class BlockAttributesRepository
{
    /**
     * Get all attributes for a block
     */
    public static function get(int $post_id): array
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getAttributesTableName();
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE post_id = %d ORDER BY attribute_order, id",
            $post_id
        ), ARRAY_A);

        if (!$rows) {
            return [];
        }

        // Process each attribute
        foreach ($rows as &$row) {
            // Convert options from JSON to array
            if (!empty($row['options'])) {
                $row['options'] = json_decode($row['options'], true) ?: [];
            } else {
                $row['options'] = null;
            }

            // Convert boolean fields
            $row['required'] = (bool) $row['required'];

            // Convert numeric fields
            if ($row['min_value'] !== null) {
                $row['min_value'] = floatval($row['min_value']);
            }
            if ($row['max_value'] !== null) {
                $row['max_value'] = floatval($row['max_value']);
            }
            if ($row['step_value'] !== null) {
                $row['step_value'] = floatval($row['step_value']);
            }
        }

        return $rows;
    }

    /**
     * Save attributes for a block (replaces all existing attributes)
     */
    public static function save(int $post_id, array $attributes): bool
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getAttributesTableName();

        // Start transaction
        $wpdb->query('START TRANSACTION');

        try {
            // Delete existing attributes for this post
            $wpdb->delete($table_name, ['post_id' => $post_id]);

            // Insert new attributes
            foreach ($attributes as $index => $attr) {
                $data = [
                    'post_id' => $post_id,
                    'attribute_name' => sanitize_key($attr['name'] ?? ''),
                    'attribute_type' => sanitize_text_field($attr['type'] ?? 'text'),
                    'attribute_order' => isset($attr['order']) ? intval($attr['order']) : $index,
                ];

                // Optional fields
                if (isset($attr['label'])) {
                    $data['label'] = sanitize_text_field($attr['label']);
                }
                if (isset($attr['placeholder'])) {
                    $data['placeholder'] = sanitize_text_field($attr['placeholder']);
                }
                if (isset($attr['help'])) {
                    $data['help_text'] = sanitize_text_field($attr['help']);
                }
                if (isset($attr['default_value'])) {
                    $data['default_value'] = sanitize_text_field($attr['default_value']);
                }
                if (isset($attr['required'])) {
                    $data['required'] = (int) $attr['required'];
                }
                if (isset($attr['validation_pattern'])) {
                    $data['validation_pattern'] = sanitize_text_field($attr['validation_pattern']);
                }

                // Handle range fields
                if (isset($attr['range'])) {
                    if (isset($attr['range']['min'])) {
                        $data['min_value'] = floatval($attr['range']['min']);
                    }
                    if (isset($attr['range']['max'])) {
                        $data['max_value'] = floatval($attr['range']['max']);
                    }
                    if (isset($attr['range']['step'])) {
                        $data['step_value'] = floatval($attr['range']['step']);
                    }
                } else {
                    // Handle legacy min/max/step fields
                    if (isset($attr['min'])) {
                        $data['min_value'] = floatval($attr['min']);
                    }
                    if (isset($attr['max'])) {
                        $data['max_value'] = floatval($attr['max']);
                    }
                    if (isset($attr['step'])) {
                        $data['step_value'] = floatval($attr['step']);
                    }
                }

                // Handle options for select/radio/checkbox fields
                if (isset($attr['options']) && is_array($attr['options']) && !empty($attr['options'])) {
                    $data['options'] = json_encode(array_values($attr['options']));
                } else if (isset($attr['options']) && is_array($attr['options']) && empty($attr['options'])) {
                    $data['options'] = null; // Store NULL for empty arrays
                }

                // Set timestamps
                $data['created_at'] = current_time('mysql');
                $data['updated_at'] = current_time('mysql');

                $result = $wpdb->insert($table_name, $data);

                if ($result === false) {
                    throw new \Exception('Failed to insert attribute: ' . $wpdb->last_error);
                }
            }

            // Commit transaction
            $wpdb->query('COMMIT');
            return true;

        } catch (\Exception $e) {
            // Rollback transaction
            $wpdb->query('ROLLBACK');
            return false;
        }
    }

    /**
     * Delete all attributes for a block
     */
    public static function delete(int $post_id): bool
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getAttributesTableName();
        $result = $wpdb->delete(
            $table_name,
            ['post_id' => $post_id]
        );

        return $result !== false;
    }

    /**
     * Add or update a single attribute
     */
    public static function saveAttribute(int $post_id, array $attribute): int
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getAttributesTableName();

        $data = [
            'post_id' => $post_id,
            'attribute_name' => sanitize_key($attribute['name'] ?? ''),
            'attribute_type' => sanitize_text_field($attribute['type'] ?? 'text'),
            'attribute_order' => isset($attribute['order']) ? intval($attribute['order']) : 0,
            'updated_at' => current_time('mysql')
        ];

        // Add optional fields (same as in save method)
        if (isset($attribute['label'])) {
            $data['label'] = sanitize_text_field($attribute['label']);
        }
        if (isset($attribute['placeholder'])) {
            $data['placeholder'] = sanitize_text_field($attribute['placeholder']);
        }
        if (isset($attribute['help'])) {
            $data['help_text'] = sanitize_text_field($attribute['help']);
        }
        if (isset($attribute['default_value'])) {
            $data['default_value'] = sanitize_text_field($attribute['default_value']);
        }
        if (isset($attribute['required'])) {
            $data['required'] = (int) $attribute['required'];
        }
        if (isset($attribute['validation_pattern'])) {
            $data['validation_pattern'] = sanitize_text_field($attribute['validation_pattern']);
        }

        // Handle range fields
        if (isset($attribute['range'])) {
            if (isset($attribute['range']['max'])) {
                $data['max_value'] = floatval($attribute['range']['max']);
            }
            if (isset($attribute['range']['step'])) {
                $data['step_value'] = floatval($attribute['range']['step']);
            }
        }

        // Handle options
        if (isset($attribute['options']) && is_array($attribute['options']) && !empty($attribute['options'])) {
            $data['options'] = json_encode(array_values($attribute['options']));
        } else if (isset($attribute['options']) && is_array($attribute['options']) && empty($attribute['options'])) {
            $data['options'] = null; // Store NULL for empty arrays
        }

        if (isset($attribute['id']) && $attribute['id']) {
            // Update existing
            $result = $wpdb->update(
                $table_name,
                $data,
                ['id' => intval($attribute['id'])]
            );
            return $result !== false ? intval($attribute['id']) : 0;
        } else {
            // Insert new
            $data['created_at'] = current_time('mysql');
            $result = $wpdb->insert($table_name, $data);
            return $result !== false ? $wpdb->insert_id : 0;
        }
    }

    /**
     * Delete a single attribute
     */
    public static function deleteAttribute(int $attribute_id): bool
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getAttributesTableName();
        $result = $wpdb->delete(
            $table_name,
            ['id' => $attribute_id]
        );

        return $result !== false;
    }

    /**
     * Get attributes for multiple blocks
     * @deprecated Use getBulk() instead for consistent data processing
     */
    public static function getMultiple(array $post_ids): array
    {
        // Delegate to getBulk() for consistency and complete data processing
        return self::getBulk($post_ids);
    }

    /**
     * Migrate attributes from post meta to database table
     */
    public static function migrateFromPostMeta(int $post_id): bool
    {
        // Get existing attributes from post meta
        $attributes_json = get_post_meta($post_id, MetaKeysConstants::BLOCK_ATTRIBUTES, true);

        if (empty($attributes_json)) {
            return true; // Nothing to migrate
        }

        $attributes = [];

        // Parse attributes JSON
        if (is_string($attributes_json)) {
            $attributes = json_decode($attributes_json, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return false;
            }
        } elseif (is_array($attributes_json)) {
            $attributes = $attributes_json;
        }

        // Save to database if we have attributes
        if (!empty($attributes) && is_array($attributes)) {
            $result = self::save($post_id, $attributes);

            if ($result) {
                // Optionally delete the old meta after successful migration
                // delete_post_meta($post_id, MetaKeysConstants::BLOCK_ATTRIBUTES);
                return true;
            }
        }

        return false;
    }

    /**
     * Migrate all blocks' attributes from post meta to database
     */
    public static function migrateAll(): int
    {
        global $wpdb;

        // Get all fanculo posts with block attributes
        $posts = $wpdb->get_col(
            "SELECT DISTINCT p.ID
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = 'funculo'
            AND pm.meta_key = '" . MetaKeysConstants::BLOCK_ATTRIBUTES . "'
            AND pm.meta_value != ''
            AND pm.meta_value IS NOT NULL"
        );

        $migrated = 0;
        foreach ($posts as $post_id) {
            if (self::migrateFromPostMeta($post_id)) {
                $migrated++;
            }
        }

        return $migrated;
    }

    /**
     * Get attributes for multiple post IDs in a single query
     * @param array $post_ids Array of post IDs
     * @return array Associative array with post_id as key and attributes array as value
     */
    public static function getBulk(array $post_ids): array
    {
        global $wpdb;

        if (empty($post_ids)) {
            return [];
        }

        $table_name = DatabaseInstaller::getAttributesTableName();
        $placeholders = implode(',', array_fill(0, count($post_ids), '%d'));

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE post_id IN ($placeholders) ORDER BY post_id, attribute_order, id",
            ...$post_ids
        ), ARRAY_A);

        if (!$rows) {
            return [];
        }

        // Group results by post_id and process each attribute
        $result = [];
        foreach ($rows as $row) {
            $post_id = $row['post_id'];

            if (!isset($result[$post_id])) {
                $result[$post_id] = [];
            }

            // Process attribute data (same logic as get() method)
            if (!empty($row['options'])) {
                $row['options'] = json_decode($row['options'], true) ?: [];
            } else {
                $row['options'] = null;
            }

            // Convert boolean fields
            $row['required'] = (bool) $row['required'];

            // Convert numeric fields
            if ($row['min_value'] !== null) {
                $row['min_value'] = floatval($row['min_value']);
            }
            if ($row['max_value'] !== null) {
                $row['max_value'] = floatval($row['max_value']);
            }
            if ($row['step_value'] !== null) {
                $row['step_value'] = floatval($row['step_value']);
            }

            $result[$post_id][] = $row;
        }

        return $result;
    }

    /**
     * Check if a block has attributes in the new table
     */
    public static function hasAttributes(int $post_id): bool
    {
        global $wpdb;

        $table_name = DatabaseInstaller::getAttributesTableName();
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE post_id = %d",
            $post_id
        ));

        return $count > 0;
    }
}