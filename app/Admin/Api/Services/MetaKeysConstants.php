<?php

namespace Fanculo\Admin\Api\Services;

/**
 * Meta Keys Constants for Fanculo Plugin
 *
 * Standardizes all meta key names with consistent '_funculo_' prefix.
 * This ensures data integrity and prevents access issues.
 */
class MetaKeysConstants
{
    // ============================================
    // BLOCK META KEYS
    // ============================================

    /** @var string Block PHP render code */
    const BLOCK_PHP = '_funculo_block_php';

    /** @var string Block SCSS styles */
    const BLOCK_SCSS = '_funculo_block_scss';

    /** @var string Block JavaScript code */
    const BLOCK_JS = '_funculo_block_js';

    /** @var string Block attributes configuration */
    const BLOCK_ATTRIBUTES = '_funculo_block_attributes';

    /** @var string Block settings (category, icon, description) */
    const BLOCK_SETTINGS = '_funculo_block_settings';

    /** @var string Selected SCSS partials for the block */
    const BLOCK_SELECTED_PARTIALS = '_funculo_block_selected_partials';

    // ============================================
    // SCSS COMPILATION META KEYS
    // ============================================

    /** @var string Raw SCSS content for compilation */
    const SCSS_CONTENT = '_funculo_scss_content';

    /** @var string Compiled CSS content */
    const CSS_CONTENT = '_funculo_css_content';

    /** @var string Timestamp when CSS was last compiled */
    const CSS_COMPILED_AT = '_funculo_css_compiled_at';

    // ============================================
    // SYMBOL META KEYS
    // ============================================

    /** @var string Symbol PHP code */
    const SYMBOL_PHP = '_funculo_symbol_php';

    // ============================================
    // SCSS PARTIAL META KEYS
    // ============================================

    /** @var string SCSS partial content */
    const SCSS_PARTIAL_SCSS = '_funculo_scss_partial_scss';

    /** @var string Whether SCSS partial is global (affects all blocks) */
    const SCSS_IS_GLOBAL = '_funculo_scss_is_global';

    /** @var string Order for global SCSS partials */
    const SCSS_GLOBAL_ORDER = '_funculo_scss_global_order';

    // ============================================
    // LEGACY META KEYS (for migration reference)
    // ============================================

    /** @var array Legacy keys that need migration to standardized format */
    const LEGACY_KEYS = [
        'funculo_scss_content' => self::SCSS_CONTENT,
        'funculo_css_content' => self::CSS_CONTENT,
        'funculo_css_compiled_at' => self::CSS_COMPILED_AT,
        'funculo_scss_is_global' => self::SCSS_IS_GLOBAL,
        'funculo_scss_global_order' => self::SCSS_GLOBAL_ORDER,
    ];

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get all meta keys as an array
     *
     * @return array All standardized meta keys
     */
    public static function getAllKeys(): array
    {
        return [
            // Block keys
            self::BLOCK_PHP,
            self::BLOCK_SCSS,
            self::BLOCK_JS,
            self::BLOCK_ATTRIBUTES,
            self::BLOCK_SETTINGS,
            self::BLOCK_SELECTED_PARTIALS,

            // SCSS compilation keys
            self::SCSS_CONTENT,
            self::CSS_CONTENT,
            self::CSS_COMPILED_AT,

            // Symbol keys
            self::SYMBOL_PHP,

            // SCSS partial keys
            self::SCSS_PARTIAL_SCSS,
            self::SCSS_IS_GLOBAL,
            self::SCSS_GLOBAL_ORDER,
        ];
    }

    /**
     * Get legacy to new key mapping
     *
     * @return array Mapping of legacy keys to new standardized keys
     */
    public static function getLegacyMapping(): array
    {
        return self::LEGACY_KEYS;
    }

    /**
     * Check if a key is a legacy key that needs migration
     *
     * @param string $key The meta key to check
     * @return bool True if key needs migration
     */
    public static function isLegacyKey(string $key): bool
    {
        return array_key_exists($key, self::LEGACY_KEYS);
    }

    /**
     * Get the standardized version of a legacy key
     *
     * @param string $legacyKey The legacy meta key
     * @return string|null The standardized key, or null if not found
     */
    public static function getStandardizedKey(string $legacyKey): ?string
    {
        return self::LEGACY_KEYS[$legacyKey] ?? null;
    }

    /**
     * Get all block-related meta keys
     *
     * @return array All block meta keys
     */
    public static function getBlockKeys(): array
    {
        return [
            self::BLOCK_PHP,
            self::BLOCK_SCSS,
            self::BLOCK_JS,
            self::BLOCK_ATTRIBUTES,
            self::BLOCK_SETTINGS,
            self::BLOCK_SELECTED_PARTIALS,
        ];
    }

    /**
     * Get all SCSS-related meta keys
     *
     * @return array All SCSS meta keys
     */
    public static function getScssKeys(): array
    {
        return [
            self::SCSS_CONTENT,
            self::CSS_CONTENT,
            self::CSS_COMPILED_AT,
            self::SCSS_PARTIAL_SCSS,
            self::SCSS_IS_GLOBAL,
            self::SCSS_GLOBAL_ORDER,
        ];
    }

    /**
     * Get all symbol-related meta keys
     *
     * @return array All symbol meta keys
     */
    public static function getSymbolKeys(): array
    {
        return [
            self::SYMBOL_PHP,
        ];
    }
}