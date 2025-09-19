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

// Define plugin constants
define('FANCULO_URL', plugin_dir_url(__FILE__));
define('FANCULO_PATH', plugin_dir_path(__FILE__));
define('FANCULO_VERSION', '0.0.1');

// Define blocks directory - save to wp-content/plugins/fanculo-blocks
$blocks_dir_name = 'fanculo-blocks';
$blocks_path = WP_PLUGIN_DIR . '/' . $blocks_dir_name;
define('FANCULO_BLOCKS_DIR', $blocks_path);
define('FANCULO_BLOCKS_URL', plugins_url($blocks_dir_name));


// Require Composer autoloader
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}


// Initialize the plugin
add_action('plugins_loaded', function() {
    \Fanculo\App::getInstance();
});

