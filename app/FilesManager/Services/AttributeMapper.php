<?php

namespace Fanculo\FilesManager\Services;

use Fanculo\Admin\Api\Services\MetaKeysConstants;
use Fanculo\FilesManager\Files\Fields\FieldRegistry;

class AttributeMapper
{
    /**
     * Parse attributes from post meta
     *
     * @param int $postId The post ID
     * @return array Parsed and validated attributes
     */
    public static function parseAttributes(int $postId): array
    {
        $attributesData = get_post_meta($postId, MetaKeysConstants::BLOCK_ATTRIBUTES, true);

        if (empty($attributesData)) {
            return [];
        }

        $attributes = [];

        try {
            $parsedData = is_string($attributesData)
                ? json_decode($attributesData, true)
                : $attributesData;

            if (json_last_error() !== JSON_ERROR_NONE || !is_array($parsedData)) {
                error_log('AttributeMapper: Invalid attributes JSON for post ' . $postId . ': ' . json_last_error_msg());
                return [];
            }

            foreach ($parsedData as $attr) {
                if (self::validateAttribute($attr)) {
                    $attributes[] = self::normalizeAttribute($attr);
                }
            }

        } catch (Exception $e) {
            error_log('AttributeMapper: Error parsing attributes for post ' . $postId . ': ' . $e->getMessage());
        }

        return $attributes;
    }

    /**
     * Validate an attribute configuration
     *
     * @param mixed $attr The attribute to validate
     * @return bool True if valid
     */
    private static function validateAttribute($attr): bool
    {
        if (!is_array($attr)) {
            return false;
        }

        // Required fields
        if (empty($attr['name']) || !is_string($attr['name'])) {
            return false;
        }

        // Validate type
        $type = $attr['type'] ?? 'text';
        if (!FieldRegistry::isSupported($type)) {
            error_log('AttributeMapper: Unsupported field type: ' . $type);
            return false;
        }

        return true;
    }

    /**
     * Normalize an attribute configuration
     *
     * @param array $attr The attribute to normalize
     * @return array Normalized attribute
     */
    private static function normalizeAttribute(array $attr): array
    {
        $normalized = [
            'name' => sanitize_key($attr['name']),
            'type' => sanitize_text_field($attr['type'] ?? 'text'),
            'label' => sanitize_text_field($attr['label'] ?? $attr['name']),
            'id' => sanitize_key($attr['id'] ?? $attr['name'])
        ];

        // Add optional fields if present
        if (isset($attr['placeholder'])) {
            $normalized['placeholder'] = sanitize_text_field($attr['placeholder']);
        }

        if (isset($attr['help'])) {
            $normalized['help'] = sanitize_text_field($attr['help']);
        }

        // Handle options for select, radio, checkbox fields
        if (isset($attr['options']) && in_array($normalized['type'], ['select', 'radio', 'checkbox'])) {
            $normalized['options'] = self::normalizeOptions($attr['options']);
        }

        // Handle range for number/range fields
        if (isset($attr['min']) && in_array($normalized['type'], ['number', 'range'])) {
            $normalized['min'] = intval($attr['min']);
        }
        if (isset($attr['max']) && in_array($normalized['type'], ['number', 'range'])) {
            $normalized['max'] = intval($attr['max']);
        }
        if (isset($attr['step']) && in_array($normalized['type'], ['number', 'range'])) {
            $normalized['step'] = floatval($attr['step']);
        }

        return $normalized;
    }

    /**
     * Normalize options for select/radio/checkbox fields
     *
     * @param mixed $options The options to normalize
     * @return array Normalized options
     */
    private static function normalizeOptions($options): array
    {
        if (is_array($options)) {
            return array_map(function($option) {
                if (is_array($option)) {
                    return [
                        'label' => sanitize_text_field($option['label'] ?? ''),
                        'value' => sanitize_text_field($option['value'] ?? '')
                    ];
                }
                return [
                    'label' => sanitize_text_field($option),
                    'value' => sanitize_text_field($option)
                ];
            }, $options);
        }

        if (is_string($options)) {
            $lines = explode("\n", $options);
            return array_map(function($line) {
                $line = trim($line);
                return [
                    'label' => $line,
                    'value' => $line
                ];
            }, array_filter($lines));
        }

        return [];
    }

    /**
     * Generate attribute schema for block.json
     *
     * @param int $postId The post ID
     * @return array Attribute schema
     */
    public static function generateAttributeSchema(int $postId): array
    {
        $attributes = self::parseAttributes($postId);
        return FieldRegistry::createAttributeSchema($attributes);
    }

    /**
     * Generate sidebar controls JavaScript
     *
     * @param int $postId The post ID
     * @return string JavaScript controls array
     */
    public static function generateSidebarControls(int $postId): string
    {
        $attributes = self::parseAttributes($postId);

        if (empty($attributes)) {
            return '';
        }

        return FieldRegistry::generateAllControls($attributes);
    }

    /**
     * Check if post has attributes
     *
     * @param int $postId The post ID
     * @return bool True if has attributes
     */
    public static function hasAttributes(int $postId): bool
    {
        $attributes = self::parseAttributes($postId);
        return !empty($attributes);
    }

    /**
     * Get attribute count for a post
     *
     * @param int $postId The post ID
     * @return int Number of attributes
     */
    public static function getAttributeCount(int $postId): int
    {
        $attributes = self::parseAttributes($postId);
        return count($attributes);
    }

    /**
     * Convert attribute name to camelCase for JavaScript
     *
     * @param string $name The attribute name
     * @return string CamelCase name
     */
    public static function toCamelCase(string $name): string
    {
        return lcfirst(str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $name))));
    }

    /**
     * Generate JavaScript constants for component imports
     *
     * @return string JavaScript component imports
     */
    public static function generateComponentImports(): string
    {
        return <<<EOT
const {
    Panel,
    PanelBody,
    PanelRow,
    __experimentalInputControl: InputControl,
    __experimentalNumberControl: NumberControl,
    RangeControl,
    ToggleControl,
    TextareaControl,
    SelectControl,
    CheckboxControl,
    RadioControl,
    ColorPalette,
    DatePicker,
    Button
} = wp.components;

const {
    MediaUpload
} = wp.blockEditor;
EOT;
    }
}