<?php

namespace Fanculo\Admin\Api;

use Fanculo\Admin\Api\Controllers\PostsApiController;
use Fanculo\Admin\Api\Controllers\PostsBatchApiController;
use Fanculo\Admin\Api\Controllers\PostsQueryApiController;
use Fanculo\Admin\Api\Controllers\PostsOperationsApiController;
use Fanculo\Admin\Api\TaxonomyApiController;
use Fanculo\Admin\Api\BlockCategoriesApiController;
use Fanculo\Admin\Api\FileGenerationApiController;
use Fanculo\Admin\Api\ScssCompilerApiController;
use Fanculo\Admin\Api\RegisteredBlocksApiController;
use Fanculo\Admin\Api\BlockAttributesApiController;
use Fanculo\Content\FunculoTypeTaxonomy;

class Api
{
    private $postsController;
    private $postsBatchController;
    private $postsQueryController;
    private $postsOperationsController;
    private $taxonomyController;
    private $blockCategoriesController;
    private $fileGenerationController;
    private $scssCompilerController;
    private $registeredBlocksController;
    private $blockAttributesController;

    public function __construct()
    {
        // Initialize refactored posts controllers - each handles its own route registration
        $this->postsController = new PostsApiController();
        $this->postsBatchController = new PostsBatchApiController();
        $this->postsQueryController = new PostsQueryApiController();
        $this->postsOperationsController = new PostsOperationsApiController();

        // Initialize other controllers
        $this->taxonomyController = new TaxonomyApiController();
        $this->blockCategoriesController = new BlockCategoriesApiController();
        $this->fileGenerationController = new FileGenerationApiController();
        $this->scssCompilerController = new ScssCompilerApiController();
        $this->registeredBlocksController = new RegisteredBlocksApiController();
        $this->blockAttributesController = new BlockAttributesApiController();

    }

    // Note: Route registration is now handled by individual controllers
    // Each controller registers its own routes via rest_api_init hook
}