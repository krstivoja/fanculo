<?php

namespace Marko\Fanculo\Admin;

class SettingsPage
{
    public function __construct()
    {
        add_action('admin_menu', [$this, 'add_admin_menu']);
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