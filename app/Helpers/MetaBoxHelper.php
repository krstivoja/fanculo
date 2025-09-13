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
    }

    public function initMetaBoxes()
    {
        // Initialize all metaboxes
        new BlocksMetaBox();
        new SymbolsMetaBox();
        new SCSSPartialsMetaBox();
    }
}