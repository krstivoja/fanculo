<?php

namespace Fanculo\Database;

class DatabaseInstaller
{
    const TABLE_VERSION = '4.0.0';
    const VERSION_OPTION = 'fanculo_db_version';
    const TABLE_NAME = 'fanculo_blocks_settings';
    const SCSS_TABLE_NAME = 'fanculo_scsspartials_settings';

    /**
     * Install the database tables
     */
    public static function install(): void
    {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        // Install blocks settings table
        $blocks_table = self::getTableName();
        $sql_blocks = "CREATE TABLE $blocks_table (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            post_id bigint(20) UNSIGNED NOT NULL,
            category varchar(255) DEFAULT NULL,
            description text DEFAULT NULL,
            icon varchar(255) DEFAULT NULL,
            supports_inner_blocks tinyint(1) DEFAULT 0,
            allowed_block_types text DEFAULT NULL,
            template text DEFAULT NULL,
            template_lock varchar(50) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY post_id (post_id),
            KEY category (category)
        ) $charset_collate;";

        // Install SCSS partials settings table
        $scss_table = self::getScssPartialsTableName();
        $sql_scss = "CREATE TABLE $scss_table (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            post_id bigint(20) UNSIGNED NOT NULL,
            is_global tinyint(1) DEFAULT 0,
            global_order int(11) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY post_id (post_id),
            KEY is_global (is_global),
            KEY global_order (global_order)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Run dbDelta for both tables
        $result_blocks = dbDelta($sql_blocks);
        $result_scss = dbDelta($sql_scss);

        // Check for errors
        if (!empty($wpdb->last_error)) {
            error_log('Fanculo Plugin: Database installation failed - ' . $wpdb->last_error);
            return;
        }

        // Log successful installation
        if (!empty($result_blocks) || !empty($result_scss)) {
            error_log('Fanculo Plugin: Database tables installed successfully');
        }

        // Store the database version
        update_option(self::VERSION_OPTION, self::TABLE_VERSION);
    }

    /**
     * Uninstall the database tables
     */
    public static function uninstall(): void
    {
        global $wpdb;

        // Drop blocks table
        $blocks_table = self::getTableName();
        $result1 = $wpdb->query("DROP TABLE IF EXISTS $blocks_table");

        // Drop SCSS partials table
        $scss_table = self::getScssPartialsTableName();
        $result2 = $wpdb->query("DROP TABLE IF EXISTS $scss_table");

        if ($result1 === false || $result2 === false) {
            error_log('Fanculo Plugin: Failed to drop tables - ' . $wpdb->last_error);
        } else {
            error_log('Fanculo Plugin: Database tables uninstalled successfully');
        }

        // Remove the version option
        delete_option(self::VERSION_OPTION);
    }

    /**
     * Check if upgrade is needed and perform migrations
     */
    public static function checkUpgrade(): void
    {
        $installed_version = get_option(self::VERSION_OPTION, '0.0.0');

        // If no version or older version, perform upgrade
        if (version_compare($installed_version, self::TABLE_VERSION, '<')) {
            self::upgrade($installed_version, self::TABLE_VERSION);
        }
    }

    /**
     * Perform database migrations
     */
    private static function upgrade(string $from_version, string $to_version): void
    {
        global $wpdb;

        error_log(sprintf('Fanculo Plugin: Upgrading database from %s to %s', $from_version, $to_version));

        // For initial installation or major changes, run full install
        if ($from_version === '0.0.0') {
            self::install();
            return;
        }

        // Migration for version 4.0.0 - Add SCSS partials table
        if (version_compare($from_version, '4.0.0', '<')) {
            $scss_table = self::getScssPartialsTableName();

            // Check if SCSS table doesn't exist yet
            if (!self::specificTableExists($scss_table)) {
                $charset_collate = $wpdb->get_charset_collate();

                $sql_scss = "CREATE TABLE $scss_table (
                    id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                    post_id bigint(20) UNSIGNED NOT NULL,
                    is_global tinyint(1) DEFAULT 0,
                    global_order int(11) DEFAULT 1,
                    created_at datetime DEFAULT CURRENT_TIMESTAMP,
                    updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY post_id (post_id),
                    KEY is_global (is_global),
                    KEY global_order (global_order)
                ) $charset_collate;";

                require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
                dbDelta($sql_scss);

                error_log('Fanculo Plugin: Added SCSS partials table');

                // Migrate existing data from post meta
                $repository = new \Fanculo\Database\ScssPartialsSettingsRepository();
                $migrated = $repository::migrateAll();
                error_log("Fanculo Plugin: Migrated $migrated SCSS partials to new table");
            }
        }

        // Update version after successful migration
        update_option(self::VERSION_OPTION, $to_version);
    }

    /**
     * Get table name with prefix
     */
    public static function getTableName(): string
    {
        global $wpdb;
        return $wpdb->prefix . self::TABLE_NAME;
    }

    /**
     * Get SCSS partials table name with prefix
     */
    public static function getScssPartialsTableName(): string
    {
        global $wpdb;
        return $wpdb->prefix . self::SCSS_TABLE_NAME;
    }

    /**
     * Check if tables exist
     */
    public static function tableExists(): bool
    {
        global $wpdb;
        $blocks_table = self::getTableName();
        $scss_table = self::getScssPartialsTableName();

        $blocks_exists = $wpdb->get_var("SHOW TABLES LIKE '$blocks_table'") === $blocks_table;
        $scss_exists = $wpdb->get_var("SHOW TABLES LIKE '$scss_table'") === $scss_table;

        return $blocks_exists && $scss_exists;
    }

    /**
     * Check if specific table exists
     */
    public static function specificTableExists(string $table_name): bool
    {
        global $wpdb;
        return $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
    }
}