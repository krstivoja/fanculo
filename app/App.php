<?php

namespace Fanculo;

use Fanculo\Admin\SettingsPage;
use Fanculo\Admin\FunculoApi;
use Fanculo\Content\FunculoPostType;
use Fanculo\Content\FunculoTypeTaxonomy;
use Fanculo\Helpers\MetaBoxHelper;

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
        new FunculoApi();
    }
}