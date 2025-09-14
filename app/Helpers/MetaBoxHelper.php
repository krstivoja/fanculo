<?php

namespace Fanculo\Helpers;

use Fanculo\MetaBoxes\BlocksMetaBox;
use Fanculo\MetaBoxes\SymbolsMetaBox;
use Fanculo\MetaBoxes\SCSSPartialsMetaBox;

class MetaBoxHelper
{
    public function __construct()
    {
        add_action('admin_init', [$this, 'initMetaBoxes']);
        add_action('admin_enqueue_scripts', [$this, 'enqueueScripts']);
    }

    public function initMetaBoxes()
    {
        // Initialize all metaboxes
        new BlocksMetaBox();
        new SymbolsMetaBox();
        new SCSSPartialsMetaBox();
    }

    public function enqueueScripts($hook)
    {
        // Assets are only loaded on the plugin settings page
        // No assets needed on post edit screens
    }
}