<?php

namespace Fanculo\Helpers;

/**
 * Case Transformer Utility
 *
 * Provides conversion between snake_case, camelCase, and kebab-case.
 * Used to transform API responses from PHP snake_case to JavaScript camelCase.
 */
class CaseTransformer
{
    /**
     * Convert snake_case string to camelCase
     *
     * @param string $string The snake_case string
     * @return string The camelCase string
     */
    public static function snakeToCamel(string $string): string
    {
        return lcfirst(str_replace('_', '', ucwords($string, '_')));
    }

    /**
     * Convert camelCase string to snake_case
     *
     * @param string $string The camelCase string
     * @return string The snake_case string
     */
    public static function camelToSnake(string $string): string
    {
        return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $string));
    }

    /**
     * Convert kebab-case string to camelCase
     *
     * @param string $string The kebab-case string
     * @return string The camelCase string
     */
    public static function kebabToCamel(string $string): string
    {
        return lcfirst(str_replace('-', '', ucwords($string, '-')));
    }

    /**
     * Convert camelCase string to kebab-case
     *
     * @param string $string The camelCase string
     * @return string The kebab-case string
     */
    public static function camelToKebab(string $string): string
    {
        return strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $string));
    }

    /**
     * Recursively transform array keys from snake_case to camelCase
     *
     * @param mixed $data The data to transform (array, object, or scalar)
     * @param array $excludeKeys Keys to exclude from transformation
     * @return mixed Transformed data
     */
    public static function transformKeysSnakeToCamel($data, array $excludeKeys = [])
    {
        if (is_array($data)) {
            $result = [];
            foreach ($data as $key => $value) {
                // Skip transformation for excluded keys
                if (in_array($key, $excludeKeys, true)) {
                    $result[$key] = is_array($value) ? self::transformKeysSnakeToCamel($value, $excludeKeys) : $value;
                } else {
                    $newKey = is_string($key) ? self::snakeToCamel($key) : $key;
                    $result[$newKey] = is_array($value) ? self::transformKeysSnakeToCamel($value, $excludeKeys) : $value;
                }
            }
            return $result;
        } elseif (is_object($data)) {
            $result = new \stdClass();
            foreach ($data as $key => $value) {
                if (in_array($key, $excludeKeys, true)) {
                    $result->$key = is_object($value) || is_array($value) ? self::transformKeysSnakeToCamel($value, $excludeKeys) : $value;
                } else {
                    $newKey = is_string($key) ? self::snakeToCamel($key) : $key;
                    $result->$newKey = is_object($value) || is_array($value) ? self::transformKeysSnakeToCamel($value, $excludeKeys) : $value;
                }
            }
            return $result;
        }

        return $data;
    }

    /**
     * Recursively transform array keys from camelCase to snake_case
     *
     * @param mixed $data The data to transform (array, object, or scalar)
     * @param array $excludeKeys Keys to exclude from transformation
     * @return mixed Transformed data
     */
    public static function transformKeysCamelToSnake($data, array $excludeKeys = [])
    {
        if (is_array($data)) {
            $result = [];
            foreach ($data as $key => $value) {
                // Skip transformation for excluded keys
                if (in_array($key, $excludeKeys, true)) {
                    $result[$key] = is_array($value) ? self::transformKeysCamelToSnake($value, $excludeKeys) : $value;
                } else {
                    $newKey = is_string($key) ? self::camelToSnake($key) : $key;
                    $result[$newKey] = is_array($value) ? self::transformKeysCamelToSnake($value, $excludeKeys) : $value;
                }
            }
            return $result;
        } elseif (is_object($data)) {
            $result = new \stdClass();
            foreach ($data as $key => $value) {
                if (in_array($key, $excludeKeys, true)) {
                    $result->$key = is_object($value) || is_array($value) ? self::transformKeysCamelToSnake($value, $excludeKeys) : $value;
                } else {
                    $newKey = is_string($key) ? self::camelToSnake($key) : $key;
                    $result->$newKey = is_object($value) || is_array($value) ? self::transformKeysCamelToSnake($value, $excludeKeys) : $value;
                }
            }
            return $result;
        }

        return $data;
    }

    /**
     * Transform specific known API fields from snake_case to camelCase
     * This is more conservative than full transformation
     *
     * @param array $data The API response data
     * @return array Transformed data
     */
    public static function transformApiResponse(array $data): array
    {
        // Define field mappings for known API fields
        $fieldMappings = [
            'global_partials' => 'globalPartials',
            'available_partials' => 'availablePartials',
            'inner_blocks_settings' => 'innerBlocksSettings',
            'supports_inner_blocks' => 'supportsInnerBlocks',
            'is_global' => 'isGlobal',
            'global_order' => 'globalOrder',
            'selected_partials' => 'selectedPartials',
            'editor_selected_partials' => 'editorSelectedPartials',
            'allowed_block_types' => 'allowedBlockTypes',
            'template_lock' => 'templateLock',
            'post_id' => 'postId',
            'attribute_name' => 'attributeName',
            'attribute_type' => 'attributeType',
            'attribute_order' => 'attributeOrder',
            'help_text' => 'helpText',
            'default_value' => 'defaultValue',
            'validation_pattern' => 'validationPattern',
            'min_value' => 'minValue',
            'max_value' => 'maxValue',
            'step_value' => 'stepValue',
            'created_at' => 'createdAt',
            'updated_at' => 'updatedAt',
        ];

        return self::applyFieldMappings($data, $fieldMappings);
    }

    /**
     * Apply field mappings recursively
     *
     * @param mixed $data The data to transform
     * @param array $mappings Field name mappings
     * @return mixed Transformed data
     */
    private static function applyFieldMappings($data, array $mappings)
    {
        if (is_array($data)) {
            $result = [];
            foreach ($data as $key => $value) {
                $newKey = isset($mappings[$key]) ? $mappings[$key] : $key;
                $result[$newKey] = is_array($value) || is_object($value)
                    ? self::applyFieldMappings($value, $mappings)
                    : $value;
            }
            return $result;
        } elseif (is_object($data)) {
            $result = new \stdClass();
            foreach ($data as $key => $value) {
                $newKey = isset($mappings[$key]) ? $mappings[$key] : $key;
                $result->$newKey = is_array($value) || is_object($value)
                    ? self::applyFieldMappings($value, $mappings)
                    : $value;
            }
            return $result;
        }

        return $data;
    }
}