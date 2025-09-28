<?php

namespace Fanculo\Services;

use function add_action;

class GutenbergSync
{
    private ScriptLoader $loader;

    public function __construct()
    {
        $this->loader = new ScriptLoader();
        add_action('enqueue_block_editor_assets', [$this, 'enqueue']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue']);
    }

    public function enqueue(): void
    {
        $this->loader->enqueueHotReload();
    }
}
