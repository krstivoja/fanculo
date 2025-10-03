<?php

namespace Fanculo\EDDUpdater;

class LicenseManager
{
    private $edd_handler;

    public function __construct()
    {
        // Initialize the EDD license handler
        $this->edd_handler = new EDDLicenseHandler();
    }

    /**
     * Render the license page content
     */
    public function render_license_page(bool $with_wrapper = true)
    {
        $license = get_option('fanculo_license_key', '');
        $status = get_option('fanculo_license_status', '');
        
        // Mask license key if it's valid (for security)
        $display_license = $license;
        if ($status === 'valid' && !empty($license)) {
            $display_license = substr($license, 0, 6) . str_repeat('*', max(0, strlen($license) - 6));
        }
        
        // Check if this is the license-gated mode (no valid license)
        $is_license_required_mode = ($status !== 'valid' || empty($license));
        
        // Show admin notices first, before any HTML output
        if (isset($_GET['sl_activation']) && !empty($_GET['message'])) {
            $message = urldecode($_GET['message']);
            $class = $_GET['sl_activation'] === 'false' ? 'notice-error' : 'notice-success';
            ?>
            <div class="notice <?php echo esc_attr($class); ?> is-dismissible relative z-50 my-5">
                <p><?php echo wp_kses_post($message); ?></p>
            </div>
            <script>
            // Clean URL after showing notice to prevent duplication
            if (window.history && window.history.replaceState) {
                const url = new URL(window.location);
                url.searchParams.delete('sl_activation');
                url.searchParams.delete('message');
                window.history.replaceState({}, document.title, url.toString());
            }
            </script>
            <?php
        }
        
        ?>
        <?php if ($with_wrapper): ?>
        <div class="wrap">
        <?php endif; ?>
            <?php if ($is_license_required_mode): ?>
                <!-- License Required Mode - Prominent activation interface -->
                <div class="fanculo-license max-w-xl mx-auto my-12 text-center text-highlight">
                    <div class="rounded-2xl border border-outline bg-base-2 p-10 shadow-2xl shadow-black/40">
                        <h1 class="mb-6 text-4xl font-semibold text-highlight">
                            <?php esc_html_e('FanCoolo WP', 'fanculo'); ?>
                        </h1>
                        <p class="mb-10 text-base text-contrast">
                            <?php esc_html_e('Enter your license key to unlock the full Fanculo experience.', 'fanculo'); ?>
                        </p>

                        <form method="post" action="" class="mx-auto flex max-w-sm flex-col gap-5">
                            <?php wp_nonce_field('fanculo_nonce', 'fanculo_nonce'); ?>

                            <input
                                type="text"
                                id="fanculo_license_key"
                                name="fanculo_license_key"
                                value="<?php echo esc_attr($display_license); ?>"
                                placeholder="<?php esc_attr_e('Enter your license key...', 'fanculo'); ?>"
                                class="w-full rounded-xl border border-outline !bg-base-1 px-4 py-3 text-center text-highlight placeholder:text-contrast focus:border-action focus:outline-none focus:ring-2 focus:ring-action"
                            />

                            <button
                                type="submit"
                                name="fanculo_license_activate"
                                value="1"
                                class="inline-flex items-center justify-center rounded-xl bg-action px-8 py-3 text-base font-semibold text-highlight shadow-md transition hover:bg-action/80 focus:outline-none focus:ring-2 focus:ring-action"
                            >
                                <?php esc_html_e('Activate License', 'fanculo'); ?>
                            </button>
                        </form>

                        <p class="mt-10 text-sm text-contrast">
                            <?php
                            printf(
                                __('Need a license? <a href="%s" target="_blank" class="font-semibold text-highlight transition hover:text-action">Purchase one here →</a>', 'fanculo'),
                                'https://dplugins.com/fanculo/'
                            );
                            ?>
                        </p>
                    </div>
                </div>
            <?php else: ?>
                <!-- Standard License Management Mode -->
                <div class="fanculo-license mx-auto my-10 max-w-3xl space-y-8 text-highlight">
                    <h1 class="text-3xl font-semibold text-highlight"><?php esc_html_e('FanCoolo WP License', 'fanculo'); ?></h1>

                    <div class="rounded-2xl border border-outline bg-base-2/70 p-6">
                        <?php if ($status === 'valid'): ?>
                            <p class="text-lg font-medium text-highlight">
                                <?php esc_html_e('✓ License is active and valid', 'fanculo'); ?>
                            </p>
                            <p class="mt-2 text-sm text-contrast">
                                <?php esc_html_e('Your license key is secured and masked for security purposes.', 'fanculo'); ?>
                            </p>
                        <?php elseif ($status === 'expired'): ?>
                            <p class="text-lg font-medium text-warning">
                                <?php esc_html_e('⚠ License has expired', 'fanculo'); ?>
                            </p>
                        <?php elseif ($status === 'invalid'): ?>
                            <p class="text-lg font-medium text-error">
                                <?php esc_html_e('✗ License is invalid', 'fanculo'); ?>
                            </p>
                        <?php else: ?>
                            <p class="text-lg font-medium text-contrast">
                                <?php esc_html_e('No license key entered', 'fanculo'); ?>
                            </p>
                        <?php endif; ?>
                    </div>

                    <form method="post" action="" class="rounded-2xl border border-outline bg-base-2/70 p-6 shadow-lg shadow-black/30">
                        <?php wp_nonce_field('fanculo_nonce', 'fanculo_nonce'); ?>
                    
                    <!-- Hidden field to preserve the actual license key when it's masked -->
                    <?php if ($status === 'valid' && !empty($license)): ?>
                        <input type="hidden" name="fanculo_license_key_actual" value="<?php echo esc_attr($license); ?>" />
                    <?php endif; ?>
                    
                    <table class="form-table">
                        <tbody>
                            <tr>
                                <th scope="row">
                                    <label for="fanculo_license_key">
                                        <?php esc_html_e('License Key', 'fanculo'); ?>
                                    </label>
                                </th>
                                <td>
                                    <div class="flex flex-wrap items-center gap-3">
                                        <input
                                            type="text"
                                            id="fanculo_license_key"
                                            name="fanculo_license_key"
                                            value="<?php echo esc_attr($display_license); ?>"
                                            class="regular-text w-full max-w-lg rounded-xl border border-outline bg-base-1 px-4 py-2.5 text-base text-highlight placeholder:text-contrast focus:border-action focus:outline-none focus:ring-2 focus:ring-action <?php echo ($status === 'valid') ? 'font-mono tracking-wide' : ''; ?>"
                                            placeholder="<?php esc_attr_e('Enter your license key here...', 'fanculo'); ?>"
                                            <?php echo ($status === 'valid') ? 'readonly' : ''; ?>
                                        />

                                        <?php if ($status === 'valid'): ?>
                                            <button type="button" id="edit-license-key" class="button button-secondary rounded-lg bg-base-3/40 px-4 py-2 text-sm font-medium text-highlight hover:bg-base-3/60 focus:outline-none focus:ring-2 focus:ring-action">
                                                <?php esc_html_e('Edit', 'fanculo'); ?>
                                            </button>
                                            <button type="button" id="cancel-edit-license" class="button button-secondary hidden rounded-lg bg-base-3/40 px-4 py-2 text-sm font-medium text-highlight hover:bg-base-3/60 focus:outline-none focus:ring-2 focus:ring-action">
                                                <?php esc_html_e('Cancel', 'fanculo'); ?>
                                            </button>
                                        <?php endif; ?>
                                    </div>

                                    <p class="description mt-2 text-sm text-contrast">
                                        <?php if ($status === 'valid'): ?>
                                            <?php esc_html_e('Your license is active. Click "Edit" to update your license key and reactivate.', 'fanculo'); ?>
                                        <?php else: ?>
                                            <?php esc_html_e('Enter your Fancoolo WP license key and click "Activate License" to enable updates and support.', 'fanculo'); ?>
                                        <?php endif; ?>
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <p class="submit mt-6 flex items-center gap-3">
                        <?php if ($status === 'valid'): ?>
                            <input 
                                type="submit" 
                                name="fanculo_license_deactivate" 
                                value="<?php esc_attr_e('Deactivate License', 'fanculo'); ?>" 
                                class="button-secondary rounded-lg bg-base-3/50 px-5 py-2 font-medium text-highlight hover:bg-base-3/70 focus:outline-none focus:ring-2 focus:ring-action"
                            />
                            <input 
                                type="submit" 
                                name="fanculo_license_activate" 
                                value="<?php esc_attr_e('Update & Reactivate', 'fanculo'); ?>" 
                                class="button-primary hidden rounded-lg bg-action px-5 py-2 font-semibold text-highlight focus:outline-none focus:ring-2 focus:ring-action"
                                id="reactivate-license-button"
                            />
                        <?php else: ?>
                            <input 
                                type="submit" 
                                name="fanculo_license_activate" 
                                value="<?php esc_attr_e('Activate License', 'fanculo'); ?>" 
                                class="button-primary rounded-lg bg-action px-5 py-2 font-semibold text-highlight hover:bg-action/80 focus:outline-none focus:ring-2 focus:ring-action"
                            />
                        <?php endif; ?>
                    </p>
                </form>
                    <div class="rounded-2xl border border-outline bg-base-2/70 p-6">
                        <h2 class="mt-0 text-xl font-semibold text-highlight"><?php esc_html_e('License Information', 'fanculo'); ?></h2>
                        <p class="text-sm text-contrast"><?php esc_html_e('Your license key provides:', 'fanculo'); ?></p>
                        <ul class="mt-4 list-disc space-y-1 pl-5 text-sm text-contrast">
                            <li><?php esc_html_e('Automatic plugin updates', 'fanculo'); ?></li>
                            <li><?php esc_html_e('Premium support access', 'fanculo'); ?></li>
                            <li><?php esc_html_e('Access to pro features and templates', 'fanculo'); ?></li>
                        </ul>

                        <p class="mt-5 text-sm text-contrast">
                            <?php
                            printf(
                                __('Need a license? <a href="%s" target="_blank" class="font-semibold text-highlight transition hover:text-action">Purchase one here</a>', 'fanculo'),
                                'https://dplugins.com/fanculo/'
                            );
                            ?>
                        </p>
                    </div>
                </div>
            <?php endif; ?>
        <?php if ($with_wrapper): ?>
        </div>
        <?php endif; ?>

        <?php if (!$is_license_required_mode): ?>
        <script>
        jQuery(document).ready(function($) {
            var originalLicense = '<?php echo esc_js($license); ?>';
            var maskedLicense = '<?php echo esc_js($display_license); ?>';
            
            $('#edit-license-key').on('click', function() {
                $('#fanculo_license_key')
                    .val(originalLicense)
                    .prop('readonly', false)
                    .removeClass('font-mono tracking-wide')
                    .addClass('font-sans tracking-normal')
                    .focus();
                
                $(this).hide();
                $('#cancel-edit-license').removeClass('hidden');
                $('#reactivate-license-button').removeClass('hidden');
            });
            
            $('#cancel-edit-license').on('click', function() {
                $('#fanculo_license_key')
                    .val(maskedLicense)
                    .prop('readonly', true)
                    .removeClass('font-sans tracking-normal')
                    .addClass('font-mono tracking-wide');
                
                $(this).addClass('hidden');
                $('#edit-license-key').show();
                $('#reactivate-license-button').addClass('hidden');
            });
        });
        </script>
        <?php endif; ?>
        <?php
    }

    /**
     * Get license status for other parts of the plugin
     */
    public static function get_license_status()
    {
        return EDDLicenseHandler::get_license_status();
    }

    /**
     * Check if license is valid
     */
    public static function is_license_valid()
    {
        return EDDLicenseHandler::is_license_valid();
    }

    /**
     * Get license key
     */
    public static function get_license_key()
    {
        return EDDLicenseHandler::get_license_key();
    }

    /**
     * Handle license activation form submission
     */
    public function handle_license_activation()
    {
        // Debug: Always log that this method was called
        error_log('Fanculo LicenseManager: handle_license_activation() called');
        
        // Check if form was submitted
        if (!isset($_POST['fanculo_license_activate'])) {
            error_log('Fanculo LicenseManager: No fanculo_license_activate POST data found');
            return;
        }

        // Debug: Log that form was submitted
        error_log('Fanculo LicenseManager: License activation form submitted');

        // Verify nonce
        if (!wp_verify_nonce($_POST['fanculo_nonce'], 'fanculo_nonce')) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p>Security check failed. Please try again.</p></div>';
            });
            return;
        }

        $license_key = sanitize_text_field($_POST['fanculo_license_key'] ?? '');
        
        if (empty($license_key)) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p>Please enter a license key.</p></div>';
            });
            return;
        }

        // Debug: Log license key (first 6 chars only for security)
        error_log('Fanculo LicenseManager: Attempting to activate license: ' . substr($license_key, 0, 6) . '...');

        // Save the license key
        update_option('fanculo_license_key', $license_key);

        // Try to validate the license
        $validation_result = $this->validate_license($license_key);
        
        // Debug: Log validation result
        error_log('Fanculo LicenseManager: License validation result: ' . print_r($validation_result, true));
        
        if ($validation_result['success']) {
            update_option('fanculo_license_status', 'valid');
            set_transient(
                'fanculo_license_notice',
                [
                    'type'    => 'success',
                    'message' => '<strong>' . esc_html__('Success!', 'fanculo') . '</strong> ' . esc_html__('License activated successfully.', 'fanculo'),
                ],
                30
            );
            wp_safe_redirect(admin_url('admin.php?page=fanculo-app'));
            exit;
        } else {
            update_option('fanculo_license_status', 'invalid');
            $error_message = $validation_result['message'] ?? 'Invalid license key';
            add_action('admin_notices', function() use ($error_message) {
                echo '<div class="notice notice-error"><p><strong>License Error:</strong> ' . esc_html($error_message) . '</p></div>';
            });
        }
    }

    /**
     * Validate license key with EDD store
     */
    private function validate_license($license_key)
    {
        $store_url = 'https://dplugins.com/';
        $item_id = 101042;
        
        // Prepare API request
        $api_params = array(
            'edd_action' => 'activate_license',
            'license'    => $license_key,
            'item_id'    => $item_id,
            'url'        => home_url()
        );

        // Debug: Log API request
        error_log('Fanculo LicenseManager: Making API request to: ' . $store_url);
        error_log('Fanculo LicenseManager: API params: ' . print_r($api_params, true));

        // Make API request
        $response = wp_remote_post($store_url, array(
            'timeout'   => 15,
            'sslverify' => false,
            'body'      => $api_params
        ));

        // Debug: Log response
        error_log('Fanculo LicenseManager: API response code: ' . wp_remote_retrieve_response_code($response));
        error_log('Fanculo LicenseManager: API response body: ' . wp_remote_retrieve_body($response));

        // Check for errors
        if (is_wp_error($response)) {
            error_log('Fanculo LicenseManager: API request error: ' . $response->get_error_message());
            return array(
                'success' => false,
                'message' => 'API request failed: ' . $response->get_error_message()
            );
        }
        
        if (200 !== wp_remote_retrieve_response_code($response)) {
            error_log('Fanculo LicenseManager: API returned non-200 status: ' . wp_remote_retrieve_response_code($response));
            return array(
                'success' => false,
                'message' => 'License server returned error code: ' . wp_remote_retrieve_response_code($response)
            );
        }

        // Decode response
        $license_data = json_decode(wp_remote_retrieve_body($response), true);
        error_log('Fanculo LicenseManager: Decoded license data: ' . print_r($license_data, true));

        if (isset($license_data['license']) && $license_data['license'] === 'valid') {
            return array('success' => true);
        } else {
            $error_message = 'Invalid license key';
            
            if (isset($license_data['error'])) {
                switch ($license_data['error']) {
                    case 'expired':
                        $error_message = 'Your license has expired.';
                        break;
                    case 'revoked':
                        $error_message = 'Your license has been revoked.';
                        break;
                    case 'missing':
                        $error_message = 'Invalid license key.';
                        break;
                    case 'invalid':
                    case 'site_inactive':
                        $error_message = 'Your license is not active for this site.';
                        break;
                    case 'item_name_mismatch':
                        $error_message = 'This license is not valid for Fancoolo WP.';
                        break;
                    case 'no_activations_left':
                        $error_message = 'Your license has reached its activation limit.';
                        break;
                }
            }
            
            return array(
                'success' => false,
                'message' => $error_message
            );
        }
    }
} 
