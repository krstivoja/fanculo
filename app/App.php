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

class App
{
    private static $instance = null;

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        $this->init();
    }

    public function init()
    {
        // Initialize admin interface
        new SettingsPage();

        // Initialize post types and taxonomies
        new FunculoPostType();
        new FunculoTypeTaxonomy();

        // Initialize metaboxes
        new MetaBoxHelper();

        // Initialize REST API
        new Api();

        // Initialize file generation system
        new FileGenerationService();

        // Initialize block loading system
        new BlockRegistrationService();

        // Initialize InnerBlocks processing system
        new InnerBlocksService();
    }
}