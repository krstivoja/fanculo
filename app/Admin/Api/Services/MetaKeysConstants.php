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

    /** @var string Block editor SCSS styles */
    const BLOCK_EDITOR_SCSS = '_funculo_block_editor_scss';

    /** @var string Block JavaScript code */
    const BLOCK_JS = '_funculo_block_js';

    /** @var string Block attributes configuration */
    const BLOCK_ATTRIBUTES = '_funculo_block_attributes';

    /** @var string Block settings (category, icon, description) */
    const BLOCK_SETTINGS = '_funculo_block_settings';

    /** @var string Selected SCSS partials for the block */
    const BLOCK_SELECTED_PARTIALS = '_funculo_block_selected_partials';

    /** @var string Inner blocks settings (enabled/disabled and allowed blocks) */
    const BLOCK_INNER_BLOCKS_SETTINGS = '_funculo_block_inner_blocks_settings';

    // ============================================
    // SCSS COMPILATION META KEYS
    // ============================================

    /** @var string Raw SCSS content for compilation */
    const SCSS_CONTENT = '_funculo_scss_content';

    /** @var string Compiled CSS content */
    const CSS_CONTENT = '_funculo_css_content';

    /** @var string Compiled editor CSS content */
    const BLOCK_EDITOR_CSS_CONTENT = '_funculo_block_editor_css_content';

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
            self::BLOCK_EDITOR_SCSS,
            self::BLOCK_JS,
            self::BLOCK_ATTRIBUTES,
            self::BLOCK_SETTINGS,
            self::BLOCK_SELECTED_PARTIALS,
            self::BLOCK_INNER_BLOCKS_SETTINGS,

            // SCSS compilation keys
            self::SCSS_CONTENT,
            self::CSS_CONTENT,
            self::BLOCK_EDITOR_CSS_CONTENT,

            // Symbol keys
            self::SYMBOL_PHP,

            // SCSS partial keys
            self::SCSS_PARTIAL_SCSS,
            self::SCSS_IS_GLOBAL,
            self::SCSS_GLOBAL_ORDER,
        ];
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
            self::BLOCK_EDITOR_SCSS,
            self::BLOCK_JS,
            self::BLOCK_ATTRIBUTES,
            self::BLOCK_SETTINGS,
            self::BLOCK_SELECTED_PARTIALS,
            self::BLOCK_INNER_BLOCKS_SETTINGS,
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
            self::BLOCK_EDITOR_CSS_CONTENT,
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