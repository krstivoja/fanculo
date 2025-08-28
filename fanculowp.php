<?php
/**
 * Plugin Name: Fanculo WP
 * Description: A plugin for creating Native Gutenberg blocks.
 * Version: 0.0.3
 * Author: DPlugins
 * Author URI: https://dplugins.com
 * Text Domain: gutenberg-studio
 * Network: true
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * Tested up to: 6.8.1
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Define plugin constants
define('FANCULOWP_URL', plugin_dir_url(__FILE__));
define('FANCULOWP_PATH', plugin_dir_path(__FILE__));
define('FANCULOWP_VERSION', '0.0.4');

// Define blocks directory - save to wp-content/plugins/gutenberg-blocks
$blocks_dir_name = 'gutenberg-blocks';
$blocks_path = WP_PLUGIN_DIR . '/' . $blocks_dir_name;
define('FANCULOWP_BLOCKS_DIR', $blocks_path);
define('FANCULOWP_BLOCKS_URL', plugins_url($blocks_dir_name));

// Include Composer autoload
require_once FANCULOWP_PATH . 'vendor/autoload.php';

// Include app files
require_once FANCULOWP_PATH . 'app/App.php';
require_once FANCULOWP_PATH . 'app/Settings.php';
require_once FANCULOWP_PATH . 'app/Vite.php';

// Initialize the plugin
if (class_exists('GutenbergBlockStudio\App\App')) {
    $app = new \GutenbergBlockStudio\App\App();
}
