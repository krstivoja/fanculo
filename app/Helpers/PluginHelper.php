<?php

namespace FanCoolo\Helpers;

use FanCoolo\Database\DatabaseInstaller;
use FanCoolo\Database\ScssPartialsSettingsRepository;

class PluginHelper
{
    /**
     * Track if activation was successful
     */
    private static bool $activation_success = true;
    /**
     * Handle plugin activation
     */
    public static function activate(): void
    {
        try {
            // Install database tables
            DatabaseInstaller::install();

            // Double-check tables were created (in case of manual deletion)
            DatabaseInstaller::ensureTablesExist();

            // Verify tables were created
            if (!DatabaseInstaller::tableExists()) {
                self::$activation_success = false;

                // Try one more time to create individual tables
                error_log('FanCoolo Plugin: Tables missing after install, attempting individual creation');
                DatabaseInstaller::createBlocksTableIfMissing();
                DatabaseInstaller::createScssTableIfMissing();

                // Final check
                if (!DatabaseInstaller::tableExists()) {
                    throw new \Exception('Database tables creation failed after multiple attempts');
                }
            }

            // Migrate existing SCSS partial settings from post meta
            $migrated = ScssPartialsSettingsRepository::migrateAll();
            if ($migrated > 0) {
                error_log("FanCoolo Plugin: Migrated $migrated SCSS partials to new table");
            }

            // Flush rewrite rules for custom post types
            flush_rewrite_rules();

            // Log successful activation
            error_log('FanCoolo Plugin: Activated successfully');
        } catch (\Exception $e) {
            error_log('FanCoolo Plugin: Activation failed - ' . $e->getMessage());

            // Show admin notice about activation failure
            add_action('admin_notices', function() use ($e) {
                echo '<div class="notice notice-error"><p>';
                echo esc_html__('FanCoolo Plugin activation failed: ', 'fancoolo') . esc_html($e->getMessage());
                echo '</p></div>';
            });
        }
    }

    /**
     * Handle plugin deactivation
     */
    public static function deactivate(): void
    {
        try {
            // Flush rewrite rules
            flush_rewrite_rules();

            // Clear any scheduled events if needed
            // wp_clear_scheduled_hook('fancoolo_scheduled_task');

            error_log('FanCoolo Plugin: Deactivated successfully');
        } catch (\Exception $e) {
            error_log('FanCoolo Plugin: Deactivation error - ' . $e->getMessage());
        }
    }

    /**
     * Handle plugin uninstall
     */
    public static function uninstall(): void
    {
        // Only run if we're actually uninstalling
        if (!defined('WP_UNINSTALL_PLUGIN')) {
            error_log('FanCoolo Plugin: Uninstall called outside of uninstall context');
            return;
        }

        try {
            // Remove database tables
            DatabaseInstaller::uninstall();

            // Verify table was removed
            if (DatabaseInstaller::tableExists()) {
                error_log('FanCoolo Plugin: Warning - Table still exists after uninstall');
            }

            // Clean up options
            delete_option('fancoolo_db_version');

            // Clean up any transients
            global $wpdb;
            $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_fancoolo_%'");
            $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_fancoolo_%'");

            // Clean up user meta if any
            $wpdb->query("DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'fancoolo_%'");

            error_log('FanCoolo Plugin: Uninstalled successfully');
        } catch (\Exception $e) {
            error_log('FanCoolo Plugin: Uninstall error - ' . $e->getMessage());
        }
    }
}