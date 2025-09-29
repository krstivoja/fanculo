<?php

namespace Fanculo\FilesManager\Mappers;

use Fanculo\FilesManager\Interfaces\FileGeneratorInterface;
use Fanculo\FilesManager\Files\Render;
use Fanculo\FilesManager\Files\ViewJS;
use Fanculo\FilesManager\Files\Style;
use Fanculo\FilesManager\Files\EditorStyle;
use Fanculo\FilesManager\Files\BlockJson;
use Fanculo\FilesManager\Files\Index;
use Fanculo\FilesManager\Files\Symbol;
use Fanculo\FilesManager\Files\ScssPartial;
use Fanculo\Content\FunculoTypeTaxonomy;

class GenerationMapper
{
    private $generators = [];
    private $contentTypeMap = [];

    public function __construct()
    {
        $this->initializeGenerators();
        $this->buildContentTypeMap();
    }

    public function getGeneratorsForContentType(string $contentType): array
    {
        if (!isset($this->contentTypeMap[$contentType])) {
            return [];
        }

        return $this->contentTypeMap[$contentType];
    }

    public function getAllGenerators(): array
    {
        return $this->generators;
    }

    public function getContentTypeMapping(): array
    {
        return [
            FunculoTypeTaxonomy::getTermBlocks() => [
                'generators' => ['render', 'view', 'css', 'editor_css', 'block_json', 'index'],
                'directory' => 'block-specific', // Each block gets its own directory
                'description' => 'WordPress blocks with render.php, view.js, style.css, editor.css, block.json, and index.js (index.asset.php generated separately)'
            ],
            FunculoTypeTaxonomy::getTermSymbols() => [
                'generators' => ['symbol'],
                'directory' => 'symbols',
                'description' => 'PHP symbol files in symbols/ directory'
            ],
            FunculoTypeTaxonomy::getTermScssPartials() => [
                'generators' => ['scss_partial'],
                'directory' => 'scss',
                'description' => 'SCSS partial files (.scss) for importing into blocks like _partial-1.scss, _partial-2.scss'
            ]
        ];
    }

    private function initializeGenerators(): void
    {
        $this->generators = [
            'render' => new Render(),
            'view' => new ViewJS(),
            'css' => new Style(),
            'editor_css' => new EditorStyle(),
            'block_json' => new BlockJson(),
            'index' => new Index(),
            'symbol' => new Symbol(),
            'scss_partial' => new ScssPartial()
        ];
    }

    private function buildContentTypeMap(): void
    {
        foreach ($this->generators as $name => $generator) {
            foreach ([
                FunculoTypeTaxonomy::getTermBlocks(),
                FunculoTypeTaxonomy::getTermSymbols(),
                FunculoTypeTaxonomy::getTermScssPartials()
            ] as $contentType) {
                if ($generator->canGenerate($contentType)) {
                    if (!isset($this->contentTypeMap[$contentType])) {
                        $this->contentTypeMap[$contentType] = [];
                    }
                    $this->contentTypeMap[$contentType][$name] = $generator;
                }
            }
        }

    }
}