<?php

namespace FanCoolo\Admin\Api;

use FanCoolo\Admin\Api\Controllers\PostsApiController;
use FanCoolo\Admin\Api\Controllers\PostsBatchApiController;
use FanCoolo\Admin\Api\Controllers\PostsQueryApiController;
use FanCoolo\Admin\Api\Controllers\PostsOperationsApiController;
use FanCoolo\Admin\Api\TaxonomyApiController;
use FanCoolo\Admin\Api\BlockCategoriesApiController;
use FanCoolo\Admin\Api\FileGenerationApiController;
use FanCoolo\Admin\Api\ScssCompilerApiController;
use FanCoolo\Admin\Api\RegisteredBlocksApiController;
use FanCoolo\Admin\Api\BlockAttributesApiController;
use FanCoolo\Content\FunculoTypeTaxonomy;

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