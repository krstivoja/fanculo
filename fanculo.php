<?php
/**
 * Plugin Name: Fanculo
 * Description: Simple WordPress plugin with React settings
 * Version: 1.0.0
 * Author: Your Name
 */

if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('FANCULO_URL', plugin_dir_url(__FILE__));
define('FANCULO_PATH', plugin_dir_path(__FILE__));

// Composer autoload
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} else {
    wp_die('Composer autoload not found. Please run "composer install".');
}

// Initialize
new \Fanculo\Admin\Settings();
new \Fanculo\Core\PostType();
new \Fanculo\Controllers\PostController();