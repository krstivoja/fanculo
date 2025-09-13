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
        // Only load on post edit screen for funculo post type
        if (('post.php' === $hook || 'post-new.php' === $hook)) {
            global $post;
            if ($post && $post->post_type === 'funculo') {
                $adminAssets = new \Fanculo\Helpers\AdminAssets();
                $adminAssets->enqueueAssets();
            }
        }
    }
}