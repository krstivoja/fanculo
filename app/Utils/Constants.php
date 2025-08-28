<?php

namespace Fanculo\Utils;

class Constants
{
    // Plugin Info
    public const PLUGIN_NAME = 'Fanculo';
    public const PLUGIN_SLUG = 'fanculo';
    public const PLUGIN_TEXT_DOMAIN = 'fanculo';
    
    // Post Types
    public const POST_TYPE_FANCULO = 'fanculo';
    
    // Taxonomies  
    public const TAXONOMY_TYPE = 'fanculo_type';
    
    // Taxonomy Terms
    public const TYPE_BLOCKS = 'blocks';
    public const TYPE_SYMBOLS = 'symbols';
    public const TYPE_SCSS = 'scss';
    
    // Meta Fields
    public const META_CONTENT = '_fanculo_content';
    public const META_STYLE = '_fanculo_style';
    public const META_ATTRIBUTES = '_fanculo_attributes';
    
    // Nonce Actions
    public const NONCE_ACTION = 'fanculo_nonce';
    
    // AJAX Actions
    public const AJAX_CREATE_POST = 'fanculo_create_post';
    public const AJAX_UPDATE_POST = 'fanculo_update_post';
    public const AJAX_GET_POST = 'fanculo_get_post';
    public const AJAX_GET_POSTS = 'fanculo_get_posts';
    public const AJAX_DELETE_POST = 'fanculo_delete_post';
    public const AJAX_SAVE_SETTINGS = 'fanculo_save_settings';
    public const AJAX_VALIDATE_LICENSE = 'fanculo_validate_license';
    
    // Capabilities
    public const CAP_MANAGE_OPTIONS = 'manage_options';
    public const CAP_EDIT_POSTS = 'edit_posts';
    public const CAP_DELETE_POSTS = 'delete_posts';
    
    // Menu Slugs
    public const MENU_BLOCKS = 'fanculo-blocks';
    public const MENU_SETTINGS = 'fanculo-settings';
    public const MENU_LICENSE = 'fanculo-license';
    
    // Option Names
    public const OPTION_SETTINGS = 'fanculo_settings';
    public const OPTION_LICENSE = 'fanculo_license';
    
    // Default Settings
    public const DEFAULT_SETTINGS = [
        'scss_compilation' => true,
        'cache_blocks' => true,
        'debug_mode' => false,
        'auto_enqueue' => true
    ];
    
    // File Paths (relative to plugin root)
    public const ASSETS_DIR = 'dist';
    public const SCSS_DIR = 'assets/scss';
    public const BLOCKS_DIR = 'blocks';
    
    public static function getTypes(): array
    {
        return [
            self::TYPE_BLOCKS,
            self::TYPE_SYMBOLS,
            self::TYPE_SCSS
        ];
    }
    
    public static function getTypeLabels(): array
    {
        return [
            self::TYPE_BLOCKS => __('Blocks', self::PLUGIN_TEXT_DOMAIN),
            self::TYPE_SYMBOLS => __('Symbols', self::PLUGIN_TEXT_DOMAIN),
            self::TYPE_SCSS => __('SCSS', self::PLUGIN_TEXT_DOMAIN)
        ];
    }
    
    public static function getTypeIcons(): array
    {
        return [
            self::TYPE_BLOCKS => '🧱',
            self::TYPE_SYMBOLS => '🔣',
            self::TYPE_SCSS => '🎨'
        ];
    }
}