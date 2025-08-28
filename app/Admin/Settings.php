<?php

namespace Fanculo\Admin;

class Settings
{
    public function __construct()
    {
        add_action('admin_menu', [$this, 'add_menu_page']);
    }

    public function add_menu_page(): void
    {
        add_menu_page(
            'Fanculo Settings',
            'Fanculo',
            'manage_options',
            'fanculo',
            [$this, 'settings_page'],
            'dashicons-admin-generic',
            100
        );
    }

    public function settings_page(): void
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $assets = new Assets();
        ?>
        <div class="wrap">
            <div id="fanculo-root"></div>
        </div>

        <?php echo $assets->getDevScripts(); ?>
        <script type="module" src="<?php echo $assets->asset('src/main.tsx'); ?>"></script>

        <script>
        window.fanculo_ajax = {
            ajax_url: '<?php echo admin_url('admin-ajax.php'); ?>',
            nonce: '<?php echo wp_create_nonce('fanculo_nonce'); ?>'
        };
        </script>
        <?php
    }
}