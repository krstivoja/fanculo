<?php

namespace Fanculo;

use Fanculo\Admin\SettingsPage;
use Fanculo\Admin\Api\Api;
use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Content\MetaBoxes\MetaBoxHelper;
use Fanculo\Services\FileGenerationService;
use Fanculo\Services\BlockRegistrationService;
use Fanculo\Services\InnerBlocksService;
use Fanculo\Dev\HotReloadService;
use Fanculo\Helpers\PluginHelper;
use Fanculo\Database\DatabaseInstaller;

class App
{
    private static ?self $instance = null;
    private static string $pluginFile = '';

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
        }

        // Initialize REST API (must be done before rest_api_init hook fires)
        $this->initializeRestApi();

        // Initialize services that need to run on all requests
        add_action('init', [$this, 'initializeServices'], 15);
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
    }

    /**
     * Initialize services
     */
    public function initializeServices(): void
    {
        new FileGenerationService();
        new BlockRegistrationService();
        new InnerBlocksService();

        // Initialize hot reload service (dev environment only)
        new HotReloadService();
    }
}