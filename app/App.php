<?php

namespace Fanculo;

use Fanculo\Admin\SettingsPage;
use Fanculo\Admin\Api\Api;
// Removed complex hot reload API controllers
use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Content\MetaBoxes\MetaBoxHelper;
use Fanculo\Services\BlockRegistrationService;
use Fanculo\Services\InnerBlocksService;
// Removed HotReloadService - using simple browser communication
use Fanculo\Services\GutenbergSync;
use Fanculo\Helpers\PluginHelper;
use Fanculo\Database\DatabaseInstaller;
use Fanculo\EDDUpdater\EDDLicenseHandler;

/**
 * Simple license checking without EDD dependency
 */
class SimpleLicenseChecker
{
    public static function is_license_valid(): bool
    {
        $status = get_option('fanculo_license_status', '');
        return $status === 'valid';
    }
    
    public static function get_license_key(): string
    {
        return get_option('fanculo_license_key', '');
    }
    
    public static function get_license_status(): string
    {
        return get_option('fanculo_license_status', '');
    }
}

class App
{
    private static ?self $instance = null;
    private static string $pluginFile = '';
    private ?EDDLicenseHandler $edd_license_handler = null;

    /**
     * Bootstrap the plugin
     */
    public static function boot(string $pluginFile): void
    {
        self::$pluginFile = $pluginFile;

        // Register lifecycle hooks
        register_activation_hook($pluginFile, [PluginHelper::class, 'activate']);
        register_deactivation_hook($pluginFile, [PluginHelper::class, 'deactivate']);
        register_uninstall_hook($pluginFile, [PluginHelper::class, 'uninstall']);

        // Initialize the app
        self::getInstance();
    }

    /**
     * Get singleton instance
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Private constructor to enforce singleton
     */
    private function __construct()
    {
        $this->init();
    }

    /**
     * Initialize the plugin
     */
    private function init(): void
    {
        // Check for database upgrades
        add_action('init', [DatabaseInstaller::class, 'checkUpgrade'], 5);

        // Register post types and taxonomies early
        add_action('init', [$this, 'registerContentTypes'], 10);

        // Initialize admin components (must be done before admin_menu hook fires)
        if (is_admin()) {
            $this->initializeAdmin();
            // Add license check for admin pages
            add_action('admin_init', [$this, 'check_license_access']);
        }

        // Initialize REST API (must be done before rest_api_init hook fires)
        $this->initializeRestApi();

        // Initialize EDD license handler after WordPress is loaded
        // Disabled due to white screen issues
        // add_action('init', [$this, 'initializeEDDUpdater'], 5);

        // Only initialize services if license is valid
        add_action('init', [$this, 'maybeInitializeServices'], 15);
    }

    /**
     * Register custom post types and taxonomies
     */
    public function registerContentTypes(): void
    {
        new FunculoPostType();
        new FunculoTypeTaxonomy();
    }

    /**
     * Initialize admin components
     */
    public function initializeAdmin(): void
    {
        new SettingsPage();
        new MetaBoxHelper();
    }

    /**
     * Initialize REST API
     */
    public function initializeRestApi(): void
    {
        new Api();
        // Removed complex hot reload API controllers - using simple browser-to-browser communication
    }

    /**
     * Initialize services
     */
    public function initializeServices(): void
    {
        try {
            new BlockRegistrationService();
            new InnerBlocksService();
            new GutenbergSync();
        } catch (\Throwable $e) {
            throw $e;
        }
    }

    /**
     * Initialize EDD Updater
     */
    public function initializeEDDUpdater(): void
    {
        try {
            // For now, just set a flag that we tried to initialize
            // Don't actually instantiate the EDDLicenseHandler to avoid white screen
            error_log('Fanculo: EDD Updater initialization attempted (disabled for stability)');
            
            // TODO: Fix EDDLicenseHandler initialization issues
            // if (class_exists('Fanculo\EDDUpdater\EDDLicenseHandler')) {
            //     $this->edd_license_handler = new EDDLicenseHandler();
            // }
        } catch (\Throwable $e) {
            // Log error but don't break the plugin
            error_log('Fanculo EDD Updater initialization failed: ' . $e->getMessage());
            error_log('Fanculo EDD Updater error trace: ' . $e->getTraceAsString());
        }
    }

    /**
     * Maybe initialize services based on license status
     */
    public function maybeInitializeServices(): void
    {
        try {
            // Use simple license checker for now
            if (SimpleLicenseChecker::is_license_valid()) {
                $this->initializeServices();
            }
        } catch (\Throwable $e) {
            // Log error but don't break the plugin
            error_log('Fanculo services initialization failed: ' . $e->getMessage());
            // Initialize services anyway to prevent complete failure
            $this->initializeServices();
        }
    }

    /**
     * Check license access and redirect if needed
     */
    public function check_license_access(): void
    {
        try {
            if (!isset($_GET['page']) || $_GET['page'] !== 'fanculo-app') {
                return;
            }

            if (SimpleLicenseChecker::is_license_valid()) {
                return;
            }
        } catch (\Throwable $e) {
            // Log error but don't break the plugin
            error_log('Fanculo license access check failed: ' . $e->getMessage());
        }
    }

}
