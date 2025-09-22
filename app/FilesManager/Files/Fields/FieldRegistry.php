<?php

namespace Fanculo\FilesManager\Files\Fields;

class FieldRegistry
{
    /**
     * Map of field types to their corresponding classes
     */
    private static $fieldMap = [
        'text' => Text::class,
        'textarea' => Textarea::class,
        'number' => Number::class,
        'range' => Range::class,
        'date' => Date::class,
        'image' => Image::class,
        'link' => Link::class,
        'color' => Color::class,
        'select' => Select::class,
        'toggle' => Toggle::class,
        'checkbox' => Checkbox::class,
        'radio' => Radio::class,
    ];

    /**
     * Map field types to their JSON schema types
     */
    private static $schemaTypeMap = [
        'text' => 'string',
        'textarea' => 'string',
        'select' => 'string',
        'radio' => 'string',
        'number' => 'number',
        'range' => 'number',
        'date' => 'string',
        'color' => 'string',
        'link' => 'object',
        'image' => 'object',
        'toggle' => 'boolean',
        'checkbox' => 'boolean',
    ];

    /**
     * Map field types to their default values
     */
    private static $defaultValueMap = [
        'text' => '',
        'textarea' => '',
        'select' => '',
        'radio' => '',
        'number' => 0,
        'range' => 0,
        'date' => '',
        'color' => '#000000',
        'link' => ['url' => '', 'text' => '', 'target' => '_self'],
        'image' => ['id' => 0, 'url' => '', 'alt' => ''],
        'toggle' => false,
        'checkbox' => false,
    ];

    /**
     * Get the field class for a given type
     *
     * @param string $type The field type
     * @return string The field class name
     */
    public static function getFieldClass(string $type): string
    {
        return self::$fieldMap[$type] ?? Text::class;
    }

    /**
     * Generate field control JavaScript for a given attribute
     *
     * @param array $attr The attribute configuration
     * @return string JavaScript code for the field control
     */
    public static function generateFieldControl(array $attr): string
    {
        $type = $attr['type'] ?? 'text';
        $fieldClass = self::getFieldClass($type);

        if (class_exists($fieldClass) && method_exists($fieldClass, 'generate')) {
            return $fieldClass::generate($attr);
        }

        // Fallback to text field
        return Text::generate($attr);
    }

    /**
     * Get JSON schema type for a field type
     *
     * @param string $type The field type
     * @return string The JSON schema type
     */
    public static function getSchemaType(string $type): string
    {
        return self::$schemaTypeMap[$type] ?? 'string';
    }

    /**
     * Get default value for a field type
     *
     * @param string $type The field type
     * @return mixed The default value
     */
    public static function getDefaultValue(string $type)
    {
        return self::$defaultValueMap[$type] ?? '';
    }

    /**
     * Check if a field type is supported
     *
     * @param string $type The field type
     * @return bool True if supported
     */
    public static function isSupported(string $type): bool
    {
        return array_key_exists($type, self::$fieldMap);
    }

    /**
     * Get all supported field types
     *
     * @return array Array of supported field types
     */
    public static function getSupportedTypes(): array
    {
        return array_keys(self::$fieldMap);
    }

    /**
     * Create attribute schema for block.json
     *
     * @param array $attributes Array of attribute configurations
     * @return array Attribute schema for block.json
     */
    public static function createAttributeSchema(array $attributes): array
    {
        $schema = [];

        foreach ($attributes as $attr) {
            if (empty($attr['name'])) {
                continue;
            }

            $type = $attr['type'] ?? 'text';
            $schema[$attr['name']] = [
                'type' => self::getSchemaType($type),
                'default' => self::getDefaultValue($type)
            ];

            // Add additional properties based on field type
            if ($type === 'select' && !empty($attr['options'])) {
                // Set enum for select fields
                $options = is_array($attr['options'])
                    ? array_column($attr['options'], 'value')
                    : explode('\n', $attr['options']);

                // Filter out empty values but ensure default is included
                $enumValues = array_filter($options, function($value) {
                    return $value !== null && $value !== '';
                });

                // Always include the default value in enum if it's not empty
                $defaultValue = $schema[$attr['name']]['default'];
                if ($defaultValue !== '' && !in_array($defaultValue, $enumValues)) {
                    $enumValues[] = $defaultValue;
                }

                // Always include empty string for optional select fields
                if (!in_array('', $enumValues)) {
                    array_unshift($enumValues, '');
                }

                $schema[$attr['name']]['enum'] = array_values($enumValues);
            }
        }

        return $schema;
    }

    /**
     * Generate JavaScript controls array for all attributes
     *
     * @param array $attributes Array of attribute configurations
     * @return string JavaScript array of controls
     */
    public static function generateAllControls(array $attributes): string
    {
        $controls = [];

        foreach ($attributes as $attr) {
            if (empty($attr['name'])) {
                continue;
            }

            $controls[] = self::generateFieldControl($attr);
        }

        return implode(',', array_filter($controls));
    }
}