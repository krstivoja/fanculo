<?php

namespace Fanculo\Admin;

use Fanculo\Utils\Constants;
use Fanculo\Utils\Helpers;

class MenuManager
{
    public function __construct()
    {
        add_action('admin_menu', [$this, 'registerMenus']);
    }

    public function registerMenus(): void
    {
        // Single main menu page with React routing
        add_menu_page(
            __('Fanculo', Constants::PLUGIN_TEXT_DOMAIN),
            Constants::PLUGIN_NAME,
            Constants::CAP_EDIT_POSTS,
            Constants::MENU_BLOCKS,
            [$this, 'renderMainPage'],
            'dashicons-admin-generic',
            100
        );
    }
    
    public function renderMainPage(): void
    {
        if (!current_user_can(Constants::CAP_EDIT_POSTS)) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }
        
        $assets = new Assets();
        $currentSettings = Helpers::getOption(Constants::OPTION_SETTINGS, Constants::DEFAULT_SETTINGS);
        $licenseData = Helpers::getOption(Constants::OPTION_LICENSE, [
            'key' => '',
            'status' => 'inactive',
            'expires' => null,
            'last_checked' => null
        ]);
        
        ?>
        <div class="wrap">
            <div id="fanculo-root"></div>
        </div>

        <?php echo $assets->getDevScripts(); ?>
        <script type="module" src="<?php echo esc_url(Helpers::getAssetUrl('src/main.tsx')); ?>"></script>

        <script>
        window.fanculo_ajax = {
            ajax_url: '<?php echo esc_url(Helpers::getAjaxUrl()); ?>',
            nonce: '<?php echo esc_attr(Helpers::createNonce()); ?>',
            plugin_url: '<?php echo esc_url(Helpers::getPluginUrl()); ?>',
            plugin_version: '<?php echo esc_attr(Helpers::getPluginVersion()); ?>',
            
            // Development info
            is_dev: <?php echo $assets->isViteAvailable() ? 'true' : 'false'; ?>,
            detected_port: <?php echo $assets->getDetectedPort() ?? 'null'; ?>,
            
            // Block data
            types: <?php echo json_encode(Constants::getTypes()); ?>,
            type_labels: <?php echo json_encode(Constants::getTypeLabels()); ?>,
            type_icons: <?php echo json_encode(Constants::getTypeIcons()); ?>,
            
            // Settings data
            settings: <?php echo json_encode($currentSettings); ?>,
            default_settings: <?php echo json_encode(Constants::DEFAULT_SETTINGS); ?>,
            
            // License data
            license: <?php echo json_encode($licenseData); ?>,
            
            // User permissions
            user_can: {
                manage_options: <?php echo current_user_can(Constants::CAP_MANAGE_OPTIONS) ? 'true' : 'false'; ?>,
                edit_posts: <?php echo current_user_can(Constants::CAP_EDIT_POSTS) ? 'true' : 'false'; ?>,
                delete_posts: <?php echo current_user_can(Constants::CAP_DELETE_POSTS) ? 'true' : 'false'; ?>
            }
        };
        </script>
        <?php
    }
}