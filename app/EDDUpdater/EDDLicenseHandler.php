<?php

namespace Fanculo\EDDUpdater;

class EDDLicenseHandler
{
    private $store_url;
    private $item_id;
    private $item_name;
    private $license_page;

    public function __construct()
    {
        // Configuration
        $this->store_url = 'https://dplugins.com/';
        $this->item_id = 101042;
        $this->item_name = 'Fancoolo WP';
        $this->license_page = 'fanculo-app';

        // Include EDD updater class
        $this->include_edd_updater();

        // Initialize hooks
        $this->init_hooks();
    }

    /**
     * Include the EDD updater class
     */
    private function include_edd_updater()
    {
        if (!class_exists('EDD_SL_Plugin_Updater')) {
            $updater_file = __DIR__ . '/EDD_SL_Plugin_Updater.php';
            if (file_exists($updater_file)) {
                include_once $updater_file;
            }
        }
    }

    /**
     * Initialize WordPress hooks
     */
    private function init_hooks()
    {
        add_action('init', [$this, 'plugin_updater']);
        add_action('admin_init', [$this, 'activate_license']);
        add_action('admin_init', [$this, 'deactivate_license']);
        add_action('admin_init', [$this, 'register_option']);
    }

    /**
     * Initialize the updater
     */
    public function plugin_updater()
    {
        // To support auto-updates, this needs to run during the wp_version_check cron job for privileged users.
        $doing_cron = defined('DOING_CRON') && DOING_CRON;
        if (!current_user_can('manage_options') && !$doing_cron) {
            return;
        }

        // retrieve our license key from the DB
        $license_key = trim(get_option('fanculo_license_key'));

        // Get plugin version from main plugin file
        $plugin_file = FANCULO_PLUGIN_FILE;
        $plugin_data = get_file_data($plugin_file, array('Version' => 'Version'));
        $version = $plugin_data['Version'] ?? '0.0.1';

        // setup the updater
        if (class_exists('EDD_SL_Plugin_Updater')) {
            new \EDD_SL_Plugin_Updater(
                $this->store_url,
                $plugin_file,
                array(
                    'version' => $version,
                    'license' => $license_key,
                    'item_id' => $this->item_id,
                    'author'  => 'devusrmk',
                    'beta'    => false,
                )
            );
        }
    }

    /**
     * Activates the license key
     */
    public function activate_license()
    {
        // listen for our activate button to be clicked
        if (!isset($_POST['fanculo_license_activate'])) {
            return;
        }

        // run a quick security check
        if (!check_admin_referer('fanculo_nonce', 'fanculo_nonce')) {
            return;
        }

        // Get license key - handle both new keys and masked keys being edited
        $license = $this->get_license_from_request();

        if (!$license) {
            $this->redirect_with_message(__('Please enter a license key.', 'gutenberg-studio'), false);
            return;
        }

        // Save the license key before attempting activation
        update_option('fanculo_license_key', $license);

        // Make API call to activate license
        $response = $this->make_api_call('activate_license', $license);

        if (is_wp_error($response)) {
            $this->redirect_with_message($response->get_error_message(), false);
            return;
        }

        $license_data = json_decode(wp_remote_retrieve_body($response));

        if (false === $license_data->success) {
            $message = $this->get_error_message($license_data->error, $license_data);
            $this->redirect_with_message($message, false);
            return;
        }

        // Success - update the license status
        update_option('fanculo_license_status', $license_data->license);
        set_transient(
            'fanculo_license_notice',
            [
                'type'    => 'success',
                'message' => '<strong>' . esc_html__('Success!', 'fanculo') . '</strong> ' . esc_html__('License activated successfully.', 'fanculo'),
            ],
            30
        );

        wp_safe_redirect(admin_url('admin.php?page=' . $this->license_page));
        exit();
    }

    /**
     * Deactivates the license key
     */
    public function deactivate_license()
    {
        // listen for our deactivate button to be clicked
        if (!isset($_POST['fanculo_license_deactivate'])) {
            return;
        }

        // run a quick security check
        if (!check_admin_referer('fanculo_nonce', 'fanculo_nonce')) {
            return;
        }

        // retrieve the license from the database
        $license = trim(get_option('fanculo_license_key'));

        // Always clear local license data first (in case remote API fails)
        delete_option('fanculo_license_status');
        delete_option('fanculo_license_key'); // Also clear the license key

        $success_message = __('License deactivated successfully.', 'gutenberg-studio');
        $warning_message = __('License deactivated locally. Remote deactivation failed - this may be normal if the license was already removed from the store.', 'gutenberg-studio');

        // If we have a license key, try to deactivate it remotely
        if (!empty($license)) {
            $response = $this->make_api_call('deactivate_license', $license);

            // Check if the remote deactivation failed
            if (is_wp_error($response) || 200 !== wp_remote_retrieve_response_code($response)) {
                $this->redirect_with_message($warning_message, false);
                return;
            }

            // Check the response from the remote API
            $license_data = json_decode(wp_remote_retrieve_body($response));

            // If remote deactivation failed but we have a response, show warning
            if ($license_data && isset($license_data->success) && false === $license_data->success) {
                $this->redirect_with_message($warning_message, false);
                return;
            }
        }

        // Success - license has been deactivated
        $this->redirect_with_message($success_message, true);
    }

    /**
     * Register the license key setting
     */
    public function register_option()
    {
        register_setting('fanculo_license', 'fanculo_license_key', [$this, 'sanitize_license']);
    }

    /**
     * Sanitize the license key
     */
    public function sanitize_license($new)
    {
        $old = get_option('fanculo_license_key');
        if ($old && $old !== $new) {
            delete_option('fanculo_license_status'); // new license has been entered, so must reactivate
        }

        return sanitize_text_field($new);
    }

    /**
     * Get license key from request (handles masked keys)
     */
    private function get_license_from_request()
    {
        $license = '';
        
        if (isset($_POST['fanculo_license_key_actual']) && !empty($_POST['fanculo_license_key_actual'])) {
            // Use the actual key from hidden field if it exists (for valid licenses being edited)
            $submitted_key = sanitize_text_field($_POST['fanculo_license_key']);
            $actual_key = sanitize_text_field($_POST['fanculo_license_key_actual']);

            // If the submitted key is different from the masked version, use the submitted key
            $current_license = get_option('fanculo_license_key', '');
            $masked_license = '';
            if (!empty($current_license)) {
                $masked_license = substr($current_license, 0, 6) . str_repeat('*', max(0, strlen($current_license) - 6));
            }

            if ($submitted_key !== $masked_license) {
                // User changed the license key
                $license = $submitted_key;
            } else {
                // User didn't change the license key, keep the original
                $license = $actual_key;
            }
        } else {
            // Normal case - new license key
            $license = !empty($_POST['fanculo_license_key']) ? sanitize_text_field($_POST['fanculo_license_key']) : '';
        }

        // If no license provided, try to get from database as fallback
        if (!$license) {
            $license = trim(get_option('fanculo_license_key'));
        }

        return $license;
    }

    /**
     * Make API call to EDD store
     */
    private function make_api_call($action, $license)
    {
        $api_params = array(
            'edd_action'  => $action,
            'license'     => $license,
            'item_id'     => $this->item_id,
            'item_name'   => rawurlencode($this->item_name),
            'url'         => home_url(),
            'environment' => function_exists('wp_get_environment_type') ? wp_get_environment_type() : 'production',
        );

        return wp_remote_post(
            $this->store_url,
            array(
                'timeout'   => 15,
                'sslverify' => false,
                'body'      => $api_params,
            )
        );
    }

    /**
     * Get error message based on EDD response
     */
    private function get_error_message($error_code, $license_data = null)
    {
        switch ($error_code) {
            case 'expired':
                $expires = $license_data->expires ?? '';
                if ($expires) {
                    return sprintf(
                        __('Your license key expired on %s.', 'gutenberg-studio'),
                        date_i18n(get_option('date_format'), strtotime($expires, current_time('timestamp')))
                    );
                }
                return __('Your license key has expired.', 'gutenberg-studio');

            case 'disabled':
            case 'revoked':
                return __('Your license key has been disabled.', 'gutenberg-studio');

            case 'missing':
                return __('Invalid license.', 'gutenberg-studio');

            case 'invalid':
            case 'site_inactive':
                return __('Your license is not active for this URL.', 'gutenberg-studio');

            case 'item_name_mismatch':
                return sprintf(__('This appears to be an invalid license key for %s.', 'gutenberg-studio'), $this->item_name);

            case 'no_activations_left':
                return __('Your license key has reached its activation limit.', 'gutenberg-studio');

            default:
                return __('An error occurred, please try again.', 'gutenberg-studio');
        }
    }

    /**
     * Redirect with message
     */
    private function redirect_with_message($message, $success)
    {
        $redirect = add_query_arg(
            array(
                'page'          => $this->license_page,
                'sl_activation' => $success ? 'true' : 'false',
                'message'       => rawurlencode($message),
            ),
            admin_url('admin.php')
        );

        wp_safe_redirect($redirect);
        exit();
    }

    /**
     * Check if license is valid (static method for external use)
     */
    public static function is_license_valid()
    {
        return get_option('fanculo_license_status', '') === 'valid';
    }

    /**
     * Get license status (static method for external use)
     */
    public static function get_license_status()
    {
        return get_option('fanculo_license_status', '');
    }

    /**
     * Get license key (static method for external use)
     */
    public static function get_license_key()
    {
        return get_option('fanculo_license_key', '');
    }
} 
