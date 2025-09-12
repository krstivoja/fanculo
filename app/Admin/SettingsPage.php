<?php

namespace Marko\Fanculo\Admin;

use Marko\Fanculo\ViteAssets;

class SettingsPage
{
    private $viteAssets;
    public function __construct()
    {
        $this->viteAssets = new ViteAssets();
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);
    }

    public function add_admin_menu()
    {
        add_menu_page(
            'Fanculo Settings',
            'Fanculo',
            'manage_options',
            'fanculo-settings',
            [$this, 'render_settings_page']
        );
    }

    public function enqueue_scripts($hook)
    {
        if ($hook === 'toplevel_page_fanculo-settings') {
            $this->viteAssets->enqueueAssets();
        }
    }

    public function render_settings_page()
    {
        ?>
        <div class="wrap">
            <h1>Fanculo Settings</h1>
            <div id="app">App</div>
        </div>
        <?php
    }
}