<?php

namespace Fanculo\Admin;

class Settings
{
    public function __construct()
    {
        add_action('admin_menu', [$this, 'add_menu_page']);
        add_action('wp_ajax_fanculo_save_settings', [$this, 'save_settings']);
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

    public function save_settings(): void
    {
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
        }

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
        }

        $settings = json_decode(stripslashes($_POST['settings']), true);
        update_option('fanculo_settings', $settings);
        
        wp_send_json_success('Settings saved');
    }
}