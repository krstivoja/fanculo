<?php

namespace GutenbergBlockStudio\App;

class Settings
{
    private $option_name = 'fanculowp_settings';

    public function __construct()
    {
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
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

        if (isset($_GET['settings-updated'])) {
            add_settings_error('fanculowp_messages', 'fanculowp_message', 'Settings Saved', 'success');
        }

        settings_errors('fanculowp_messages');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('fanculowp_settings_group');
                do_settings_sections('fanculowp-settings');
                submit_button('Save Settings');
                ?>
            </form>
        </div>
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
}