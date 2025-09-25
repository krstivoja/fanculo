<?php

namespace Fanculo\Database;

class DatabaseInstaller
{
    const TABLE_VERSION = '1.0.0';
    const VERSION_OPTION = 'fanculo_db_version';
    const TABLE_NAME = 'fanculo_blocks_settings';

    /**
     * Install the database table
     */
    public static function install(): void
    {
        global $wpdb;

        $table_name = self::getTableName();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            post_id bigint(20) UNSIGNED NOT NULL,
            setting_key varchar(255) NOT NULL,
            setting_value longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY post_id (post_id),
            KEY setting_key (setting_key)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        $result = dbDelta($sql);

        // Check for errors
        if (!empty($wpdb->last_error)) {
            error_log('Fanculo Plugin: Database installation failed - ' . $wpdb->last_error);
            return;
        }

        // Log successful installation
        if (!empty($result)) {
            error_log('Fanculo Plugin: Database table installed successfully');
        }

        // Store the database version
        update_option(self::VERSION_OPTION, self::TABLE_VERSION);
    }

    /**
     * Uninstall the database table
     */
    public static function uninstall(): void
    {
        global $wpdb;

        $table_name = self::getTableName();

        // Drop the table
        $result = $wpdb->query("DROP TABLE IF EXISTS $table_name");

        if ($result === false) {
            error_log('Fanculo Plugin: Failed to drop table - ' . $wpdb->last_error);
        } else {
            error_log('Fanculo Plugin: Database table uninstalled successfully');
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

        // Future migration example:
        // if (version_compare($from_version, '1.1.0', '<')) {
        //     $table_name = self::getTableName();
        //     $wpdb->query("ALTER TABLE $table_name ADD COLUMN new_field VARCHAR(255)");
        // }

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
     * Check if table exists
     */
    public static function tableExists(): bool
    {
        global $wpdb;
        $table_name = self::getTableName();
        return $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
    }
}