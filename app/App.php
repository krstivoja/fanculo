<?php

namespace GutenbergBlockStudio\App;

class App
{
    private $settings;

    public function __construct()
    {
        $this->init();
    }

    private function init()
    {
        $this->settings = new Settings();
        
        add_action('init', [$this, 'load_textdomain']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('admin_enqueue_scripts', [$this, 'admin_enqueue_scripts']);
    }

    public function load_textdomain()
    {
        load_plugin_textdomain('gutenberg-studio', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    public function enqueue_scripts()
    {
        if (Settings::get_setting('enable_block_studio', 1)) {
            wp_enqueue_style('fanculowp-style', FANCULOWP_URL . 'assets/style.css', [], FANCULOWP_VERSION);
        }
    }

    public function admin_enqueue_scripts($hook)
    {
        if ('settings_page_fanculowp-settings' !== $hook) {
            return;
        }
        
        wp_enqueue_style('fanculowp-admin-style', FANCULOWP_URL . 'assets/admin-style.css', [], FANCULOWP_VERSION);
    }

    public function get_settings()
    {
        return $this->settings;
    }
}