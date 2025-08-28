<?php

namespace GutenbergBlockStudio\App;

class Settings
{
    private $option_name = 'fanculowp_settings';

    public function __construct()
    {
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_ajax_fanculo_save_settings', [$this, 'ajax_save_settings']);
        add_action('wp_ajax_fanculo_get_settings', [$this, 'ajax_get_settings']);
    }

    public function add_settings_page()
    {
        add_menu_page(
            'Fanculo WP Settings',
            'Fanculo WP',
            'manage_options',
            'fanculowp-settings',
            [$this, 'settings_page_html'],
            'dashicons-block-default',
            100
        );
    }

    public function register_settings()
    {
        register_setting(
            'fanculowp_settings_group',
            $this->option_name,
            [$this, 'sanitize_settings']
        );

        add_settings_section(
            'fanculowp_general_section',
            'General Settings',
            [$this, 'general_section_callback'],
            'fanculowp-settings'
        );

        add_settings_field(
            'enable_block_studio',
            'Enable Block Studio',
            [$this, 'enable_block_studio_callback'],
            'fanculowp-settings',
            'fanculowp_general_section'
        );

        add_settings_field(
            'blocks_directory',
            'Blocks Directory',
            [$this, 'blocks_directory_callback'],
            'fanculowp-settings',
            'fanculowp_general_section'
        );

        add_settings_field(
            'debug_mode',
            'Debug Mode',
            [$this, 'debug_mode_callback'],
            'fanculowp-settings',
            'fanculowp_general_section'
        );
    }

    public function sanitize_settings($input)
    {
        $sanitized = [];
        
        $sanitized['enable_block_studio'] = isset($input['enable_block_studio']) ? 1 : 0;
        $sanitized['blocks_directory'] = sanitize_text_field($input['blocks_directory']);
        $sanitized['debug_mode'] = isset($input['debug_mode']) ? 1 : 0;
        
        return $sanitized;
    }

    public function general_section_callback()
    {
        echo '<p>Configure your Fanculo WP settings below.</p>';
    }

    public function enable_block_studio_callback()
    {
        $options = get_option($this->option_name);
        $checked = isset($options['enable_block_studio']) && $options['enable_block_studio'] ? 'checked' : '';
        
        echo "<input type='checkbox' id='enable_block_studio' name='{$this->option_name}[enable_block_studio]' value='1' {$checked} />";
        echo "<label for='enable_block_studio'>Enable the Gutenberg Block Studio</label>";
    }

    public function blocks_directory_callback()
    {
        $options = get_option($this->option_name);
        $value = isset($options['blocks_directory']) ? $options['blocks_directory'] : 'gutenberg-blocks';
        
        echo "<input type='text' id='blocks_directory' name='{$this->option_name}[blocks_directory]' value='{$value}' class='regular-text' />";
        echo "<p class='description'>Directory name where blocks will be saved (relative to wp-content/plugins/)</p>";
    }

    public function debug_mode_callback()
    {
        $options = get_option($this->option_name);
        $checked = isset($options['debug_mode']) && $options['debug_mode'] ? 'checked' : '';
        
        echo "<input type='checkbox' id='debug_mode' name='{$this->option_name}[debug_mode]' value='1' {$checked} />";
        echo "<label for='debug_mode'>Enable debug mode for development</label>";
    }

    public function settings_page_html()
    {
        if (!current_user_can('manage_options')) {
            return;
        }

        $vite = new \GutenbergBlockStudio\App\Vite();

        ?>
        <div class="wrap">
            <div id="fanculo-settings-root"></div>
        </div>

        <?php 
        // Vite client and React refresh for development
        echo $vite->client();
        echo $vite->reactRefresh();
        
        // Load CSS files (production only, dev handles CSS automatically)
        foreach ($vite->getCSSAssets() as $cssFile) {
            echo "<link rel='stylesheet' href='{$cssFile}'>";
        }
        ?>

        <!-- Main app entry point -->
        <script type="module" src="<?php echo $vite->asset('src/main.tsx'); ?>"></script>

        <script>
        window.fanculo_ajax = {
            ajax_url: '<?php echo admin_url('admin-ajax.php'); ?>',
            nonce: '<?php echo wp_create_nonce('fanculo_nonce'); ?>'
        };
        
        // Debug CSS loading
        console.log('Vite dev mode:', <?php echo $vite->isDev() ? 'true' : 'false'; ?>);
        console.log('Main script src:', '<?php echo $vite->asset('src/main.tsx'); ?>');
        
        // Check for CSS injection after a delay
        setTimeout(() => {
            const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
            console.log('All stylesheets:', styles.map(s => ({
                type: s.tagName,
                href: s.href || 'inline',
                content: s.tagName === 'STYLE' ? s.innerHTML.substring(0, 100) + '...' : null
            })));
            
            // Check if Tailwind classes are working
            const testEl = document.createElement('div');
            testEl.className = 'bg-red-500 p-4';
            testEl.style.position = 'absolute';
            testEl.style.top = '-1000px';
            testEl.textContent = 'CSS Test';
            document.body.appendChild(testEl);
            const computedStyle = getComputedStyle(testEl);
            console.log('Tailwind test - bg-red-500 background:', computedStyle.backgroundColor);
            console.log('Tailwind test - p-4 padding:', computedStyle.padding);
            document.body.removeChild(testEl);
        }, 3000);
        </script>
        <?php
    }


    public function get_option($key, $default = '')
    {
        $options = get_option($this->option_name);
        return isset($options[$key]) ? $options[$key] : $default;
    }

    public static function get_setting($key, $default = '')
    {
        $options = get_option('fanculowp_settings');
        return isset($options[$key]) ? $options[$key] : $default;
    }

    public function ajax_save_settings()
    {
        // Check nonce
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
            return;
        }

        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }

        // Get and sanitize settings
        $settings = json_decode(stripslashes($_POST['settings']), true);
        
        if (!is_array($settings)) {
            wp_send_json_error('Invalid settings data');
            return;
        }

        $sanitized_settings = $this->sanitize_settings($settings);
        
        // Save settings
        $updated = update_option($this->option_name, $sanitized_settings);
        
        if ($updated) {
            wp_send_json_success('Settings saved successfully');
        } else {
            wp_send_json_error('Failed to save settings');
        }
    }

    public function ajax_get_settings()
    {
        // Check nonce
        if (!wp_verify_nonce($_POST['nonce'], 'fanculo_nonce')) {
            wp_send_json_error('Invalid nonce');
            return;
        }

        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }

        $options = get_option($this->option_name, []);
        
        // Set defaults
        $defaults = [
            'enable_block_studio' => 1,
            'blocks_directory' => 'gutenberg-blocks',
            'debug_mode' => 0,
        ];

        $settings = wp_parse_args($options, $defaults);
        
        wp_send_json_success($settings);
    }
}