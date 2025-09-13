<?php
/**
 * Plugin Name: Fanculo
 * Plugin URI: https://example.com/fanculo-wp
 * Description: Build gutenberg blocks without scraming in the screen.
 * Version: 0.0.1
 * Author: Marko Krstic
 * Author URI: https://example.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: fanculo-wp
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 8.0
 * Network: false
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}


// Require Composer autoloader
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// Initialize the plugin
add_action('plugins_loaded', function() {
    // Initialize admin interface
    new \Fanculo\Admin\SettingsPage();

    // Initialize post types and taxonomies
    new \Fanculo\PostTypes\FunculoPostType();
    new \Fanculo\Taxonomies\FunculoTypeTaxonomy();

    // Initialize meta box helper
    new \Fanculo\Helpers\MetaBoxHelper();

    // Initialize REST API
    new \Fanculo\Admin\FunculoApi();
});

