<?php

namespace FanCoolo\Admin;

use FanCoolo\Helpers\AdminAssets;
use FanCoolo\EDDUpdater\LicenseManager;

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
            add_action('admin_init', [$this, 'process_license_submission']);
        }
    }

    public function process_license_submission(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            return;
        }

        if (!isset($_GET['page']) || $_GET['page'] !== 'fancoolo-app') {
            return;
        }

        $license_manager = new LicenseManager();
        $license_manager->handle_license_activation();
    }

    public function add_admin_menu()
    {
        add_menu_page(
            'FanCoolo WP',
            'FanCoolo WP',
            'manage_options',
            'fancoolo-app',
            [$this, 'render_settings_page']
        );
    }

    public function enqueue_scripts($hook)
    {
        if ($hook !== 'toplevel_page_fancoolo-app') {
            return;
        }

        if (LicenseManager::is_license_valid()) {
            $this->adminAssets->enqueueAssets();
        } else {
            $this->adminAssets->enqueueLicenseStyles();
        }
    }

    public function render_settings_page()
    {
        try {
            $license_manager = new LicenseManager();
            $license_status = LicenseManager::get_license_status();
            $license_key = LicenseManager::get_license_key();
            $license_is_valid = ($license_status === 'valid' && !empty($license_key));

            echo '<div class="wrap">';
            echo '<h1>' . esc_html__('FanCoolo', 'fancoolo') . '</h1>';

            $notice = get_transient('fancoolo_license_notice');
            if ($notice) {
                delete_transient('fancoolo_license_notice');
                $type = isset($notice['type']) ? sanitize_html_class($notice['type']) : 'success';
                $message = isset($notice['message']) ? wp_kses_post($notice['message']) : '';
                if ($message) {
                    $class = $type === 'success' ? 'notice-success' : 'notice-info';
                    echo '<div class="notice ' . esc_attr($class) . ' is-dismissible"><p>' . $message . '</p></div>';
                }
            }

            if ($license_is_valid) {
                echo '<div id="fancoolo-app"></div>';
            } else {
                $license_manager->render_license_page(false);
            }

            echo '</div>';
        } catch (\Throwable $e) {
            // Show error message if something goes wrong
            ?>
            <div class="wrap">
                <div class="notice notice-error">
                    <p><strong>Error:</strong> <?php echo esc_html($e->getMessage()); ?></p>
                </div>
            </div>
            <?php
            error_log('FanCoolo settings page error: ' . $e->getMessage());
        }
    }
}
