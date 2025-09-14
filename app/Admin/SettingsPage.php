<?php

namespace Fanculo\Admin;

use Fanculo\Helpers\AdminAssets;

class SettingsPage
{
    private $adminAssets;
    public function __construct()
    {
        $this->adminAssets = new AdminAssets();

        // Only add actions if WordPress functions are available
        if (function_exists('add_action')) {
            add_action('admin_menu', [$this, 'add_admin_menu']);
            add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);
        }
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
            $this->adminAssets->enqueueAssets();
        }
    }

    public function render_settings_page()
    {
        ?>
        <div class="wrap">
            <div id="fanculo-app"></div>
        </div>
        <?php
    }
}