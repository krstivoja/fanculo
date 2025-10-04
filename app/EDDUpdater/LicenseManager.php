<?php

namespace FanCoolo\EDDUpdater;

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
        $license = get_option('fancoolo_license_key', '');
        $status = get_option('fancoolo_license_status', '');
        
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
                <div class="fancoolo-license max-w-xl mx-auto my-12 text-center text-highlight">
                    <div class="rounded-2xl border border-outline bg-base-2 p-10 shadow-2xl shadow-black/40">
                        <h1 class="mb-6 text-4xl font-semibold text-highlight">
                            <?php esc_html_e('FanCoolo WP', 'fancoolo'); ?>
                        </h1>
                        <p class="mb-10 text-base text-contrast">
                            <?php esc_html_e('Enter your license key to unlock the full FanCoolo experience.', 'fancoolo'); ?>
                        </p>

                        <form method="post" action="" class="mx-auto flex max-w-sm flex-col gap-5">
                            <?php wp_nonce_field('fancoolo_nonce', 'fancoolo_nonce'); ?>

                            <input
                                type="text"
                                id="fancoolo_license_key"
                                name="fancoolo_license_key"
                                value="<?php echo esc_attr($display_license); ?>"
                                placeholder="<?php esc_attr_e('Enter your license key...', 'fancoolo'); ?>"
                                class="w-full rounded-xl border border-outline !bg-base-1 px-4 py-3 text-center text-highlight placeholder:text-contrast focus:border-action focus:outline-none focus:ring-2 focus:ring-action"
                            />

                            <button
                                type="submit"
                                name="fancoolo_license_activate"
                                value="1"
                                class="inline-flex items-center justify-center rounded-xl bg-action px-8 py-3 text-base font-semibold text-highlight shadow-md transition hover:bg-action/80 focus:outline-none focus:ring-2 focus:ring-action"
                            >
                                <?php esc_html_e('Activate License', 'fancoolo'); ?>
                            </button>
                        </form>

                        <p class="mt-10 text-sm text-contrast">
                            <?php
                            printf(
                                __('Need a license? <a href="%s" target="_blank" class="font-semibold text-highlight transition hover:text-action">Purchase one here →</a>', 'fancoolo'),
                                'https://dplugins.com/fancoolo/'
                            );
                            ?>
                        </p>
                    </div>
                </div>
            <?php else: ?>
                <!-- Standard License Management Mode -->
                <div class="fancoolo-license mx-auto my-10 max-w-3xl space-y-8 text-highlight">
                    <h1 class="text-3xl font-semibold text-highlight"><?php esc_html_e('FanCoolo WP License', 'fancoolo'); ?></h1>

                    <div class="rounded-2xl border border-outline bg-base-2/70 p-6">
                        <?php if ($status === 'valid'): ?>
                            <p class="text-lg font-medium text-highlight">
                                <?php esc_html_e('✓ License is active and valid', 'fancoolo'); ?>
                            </p>
                            <p class="mt-2 text-sm text-contrast">
                                <?php esc_html_e('Your license key is secured and masked for security purposes.', 'fancoolo'); ?>
                            </p>
                        <?php elseif ($status === 'expired'): ?>
                            <p class="text-lg font-medium text-warning">
                                <?php esc_html_e('⚠ License has expired', 'fancoolo'); ?>
                            </p>
                        <?php elseif ($status === 'invalid'): ?>
                            <p class="text-lg font-medium text-error">
                                <?php esc_html_e('✗ License is invalid', 'fancoolo'); ?>
                            </p>
                        <?php else: ?>
                            <p class="text-lg font-medium text-contrast">
                                <?php esc_html_e('No license key entered', 'fancoolo'); ?>
                            </p>
                        <?php endif; ?>
                    </div>

                    <form method="post" action="" class="rounded-2xl border border-outline bg-base-2/70 p-6 shadow-lg shadow-black/30">
                        <?php wp_nonce_field('fancoolo_nonce', 'fancoolo_nonce'); ?>
                    
                    <!-- Hidden field to preserve the actual license key when it's masked -->
                    <?php if ($status === 'valid' && !empty($license)): ?>
                        <input type="hidden" name="fancoolo_license_key_actual" value="<?php echo esc_attr($license); ?>" />
                    <?php endif; ?>
                    
                    <table class="form-table">
                        <tbody>
                            <tr>
                                <th scope="row">
                                    <label for="fancoolo_license_key">
                                        <?php esc_html_e('License Key', 'fancoolo'); ?>
                                    </label>
                                </th>
                                <td>
                                    <div class="flex flex-wrap items-center gap-3">
                                        <input
                                            type="text"
                                            id="fancoolo_license_key"
                                            name="fancoolo_license_key"
                                            value="<?php echo esc_attr($display_license); ?>"
                                            class="regular-text w-full max-w-lg rounded-xl border border-outline bg-base-1 px-4 py-2.5 text-base text-highlight placeholder:text-contrast focus:border-action focus:outline-none focus:ring-2 focus:ring-action <?php echo ($status === 'valid') ? 'font-mono tracking-wide' : ''; ?>"
                                            placeholder="<?php esc_attr_e('Enter your license key here...', 'fancoolo'); ?>"
                                            <?php echo ($status === 'valid') ? 'readonly' : ''; ?>
                                        />

                                        <?php if ($status === 'valid'): ?>
                                            <button type="button" id="edit-license-key" class="button button-secondary rounded-lg bg-base-3/40 px-4 py-2 text-sm font-medium text-highlight hover:bg-base-3/60 focus:outline-none focus:ring-2 focus:ring-action">
                                                <?php esc_html_e('Edit', 'fancoolo'); ?>
                                            </button>
                                            <button type="button" id="cancel-edit-license" class="button button-secondary hidden rounded-lg bg-base-3/40 px-4 py-2 text-sm font-medium text-highlight hover:bg-base-3/60 focus:outline-none focus:ring-2 focus:ring-action">
                                                <?php esc_html_e('Cancel', 'fancoolo'); ?>
                                            </button>
                                        <?php endif; ?>
                                    </div>

                                    <p class="description mt-2 text-sm text-contrast">
                                        <?php if ($status === 'valid'): ?>
                                            <?php esc_html_e('Your license is active. Click "Edit" to update your license key and reactivate.', 'fancoolo'); ?>
                                        <?php else: ?>
                                            <?php esc_html_e('Enter your Fancoolo WP license key and click "Activate License" to enable updates and support.', 'fancoolo'); ?>
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
                                name="fancoolo_license_deactivate" 
                                value="<?php esc_attr_e('Deactivate License', 'fancoolo'); ?>" 
                                class="button-secondary rounded-lg bg-base-3/50 px-5 py-2 font-medium text-highlight hover:bg-base-3/70 focus:outline-none focus:ring-2 focus:ring-action"
                            />
                            <input 
                                type="submit" 
                                name="fancoolo_license_activate" 
                                value="<?php esc_attr_e('Update & Reactivate', 'fancoolo'); ?>" 
                                class="button-primary hidden rounded-lg bg-action px-5 py-2 font-semibold text-highlight focus:outline-none focus:ring-2 focus:ring-action"
                                id="reactivate-license-button"
                            />
                        <?php else: ?>
                            <input 
                                type="submit" 
                                name="fancoolo_license_activate" 
                                value="<?php esc_attr_e('Activate License', 'fancoolo'); ?>" 
                                class="button-primary rounded-lg bg-action px-5 py-2 font-semibold text-highlight hover:bg-action/80 focus:outline-none focus:ring-2 focus:ring-action"
                            />
                        <?php endif; ?>
                    </p>
                </form>
                    <div class="rounded-2xl border border-outline bg-base-2/70 p-6">
                        <h2 class="mt-0 text-xl font-semibold text-highlight"><?php esc_html_e('License Information', 'fancoolo'); ?></h2>
                        <p class="text-sm text-contrast"><?php esc_html_e('Your license key provides:', 'fancoolo'); ?></p>
                        <ul class="mt-4 list-disc space-y-1 pl-5 text-sm text-contrast">
                            <li><?php esc_html_e('Automatic plugin updates', 'fancoolo'); ?></li>
                            <li><?php esc_html_e('Premium support access', 'fancoolo'); ?></li>
                            <li><?php esc_html_e('Access to pro features and templates', 'fancoolo'); ?></li>
                        </ul>

                        <p class="mt-5 text-sm text-contrast">
                            <?php
                            printf(
                                __('Need a license? <a href="%s" target="_blank" class="font-semibold text-highlight transition hover:text-action">Purchase one here</a>', 'fancoolo'),
                                'https://dplugins.com/fancoolo/'
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
                $('#fancoolo_license_key')
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
                $('#fancoolo_license_key')
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
        // Check if form was submitted
        if (!isset($_POST['fancoolo_license_activate'])) {
            return;
        }

        // Verify nonce
        if (!wp_verify_nonce($_POST['fancoolo_nonce'], 'fancoolo_nonce')) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p>Security check failed. Please try again.</p></div>';
            });
            return;
        }

        $license_key = sanitize_text_field($_POST['fancoolo_license_key'] ?? '');

        if (empty($license_key)) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p>Please enter a license key.</p></div>';
            });
            return;
        }

        // Save the license key
        update_option('fancoolo_license_key', $license_key);

        // Try to validate the license
        $validation_result = $this->validate_license($license_key);
        
        if ($validation_result['success']) {
            update_option('fancoolo_license_status', 'valid');
            set_transient(
                'fancoolo_license_notice',
                [
                    'type'    => 'success',
                    'message' => '<strong>' . esc_html__('Success!', 'fancoolo') . '</strong> ' . esc_html__('License activated successfully.', 'fancoolo'),
                ],
                30
            );
            wp_safe_redirect(admin_url('admin.php?page=fancoolo-app'));
            exit;
        } else {
            update_option('fancoolo_license_status', 'invalid');
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

        // Make API request
        $response = wp_remote_post($store_url, array(
            'timeout'   => 15,
            'sslverify' => false,
            'body'      => $api_params
        ));

        // Check for errors
        if (is_wp_error($response)) {
            \FanCoolo\Services\ErrorLogger::log(
                'License API request failed: ' . $response->get_error_message(),
                'LicenseManager'
            );
            return array(
                'success' => false,
                'message' => 'API request failed: ' . $response->get_error_message()
            );
        }

        if (200 !== wp_remote_retrieve_response_code($response)) {
            \FanCoolo\Services\ErrorLogger::log(
                'License server returned error code: ' . wp_remote_retrieve_response_code($response),
                'LicenseManager'
            );
            return array(
                'success' => false,
                'message' => 'License server returned error code: ' . wp_remote_retrieve_response_code($response)
            );
        }

        // Decode response
        $license_data = json_decode(wp_remote_retrieve_body($response), true);

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
