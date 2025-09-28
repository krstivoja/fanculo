<?php
/**
 * Plugin Name: Fanculo
 * Plugin URI: https://github.com/marko-krstic/fanculo
 * Description: Build gutenberg blocks without scraming in the screen.
 * Version: 0.0.1
 * Author: Marko Krstic
 * Author URI: https://dplugins.com/
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: fanculo
 * Requires at least: 5.0
 * Tested up to: 6.8.2
 * Requires PHP: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('FANCULO_PLUGIN_FILE', __FILE__);
define('FANCULO_URL', plugin_dir_url(__FILE__));
define('FANCULO_PATH', plugin_dir_path(__FILE__));
define('FANCULO_VERSION', '0.0.1');

// Define blocks directory - save to wp-content/plugins/fanculo-blocks
$blocks_dir_name = 'fanculo-blocks';
$blocks_path = WP_PLUGIN_DIR . '/' . $blocks_dir_name;
define('FANCULO_BLOCKS_DIR', $blocks_path);
define('FANCULO_BLOCKS_URL', plugins_url($blocks_dir_name));

// Check for Composer autoloader
$autoloader = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoloader)) {
    add_action('admin_notices', function() {
        echo '<div class="notice notice-error"><p>';
        echo __('Fanculo Plugin Error: Composer dependencies are missing. Please run "composer install" in the plugin directory.', 'fanculo');
        echo '</p></div>';
    });
    return; // Stop plugin initialization
}

// Load Composer autoloader
require_once $autoloader;

// Bootstrap the plugin
add_action('plugins_loaded', function() {
    \Fanculo\App::boot(FANCULO_PLUGIN_FILE);
});
