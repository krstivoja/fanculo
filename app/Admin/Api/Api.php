<?php

namespace Fanculo\Admin\Api;

use Fanculo\Admin\Api\PostsApiController;
use Fanculo\Admin\Api\TaxonomyApiController;
use Fanculo\Admin\Api\BlockCategoriesApiController;
use Fanculo\Admin\Api\FileGenerationApiController;
use Fanculo\Admin\Api\ScssCompilerApiController;
use Fanculo\Content\FunculoTypeTaxonomy;

class Api
{
    private $postsController;
    private $taxonomyController;
    private $blockCategoriesController;
    private $fileGenerationController;
    private $scssCompilerController;

    public function __construct()
    {
        // Initialize controllers - each handles its own route registration
        $this->postsController = new PostsApiController();
        $this->taxonomyController = new TaxonomyApiController();
        $this->blockCategoriesController = new BlockCategoriesApiController();
        $this->fileGenerationController = new FileGenerationApiController();
        $this->scssCompilerController = new ScssCompilerApiController();
    }

    // Note: Route registration is now handled by individual controllers
    // Each controller registers its own routes via rest_api_init hook
}