<?php

namespace Fanculo\FilesManager\Mappers;

use Fanculo\FilesManager\Contracts\FileGeneratorInterface;
use Fanculo\FilesManager\Generators\RenderFileGenerator;
use Fanculo\FilesManager\Generators\ViewFileGenerator;
use Fanculo\FilesManager\Generators\StyleFileGenerator;
use Fanculo\FilesManager\Generators\CssFileGenerator;
use Fanculo\FilesManager\Generators\BlockJsonGenerator;
use Fanculo\FilesManager\Generators\SymbolFileGenerator;
use Fanculo\FilesManager\Generators\ScssPartialGenerator;
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
                'generators' => ['render', 'view', 'style', 'css', 'block_json'],
                'directory' => 'block-specific', // Each block gets its own directory
                'description' => 'WordPress blocks with render.php, view.js, style.scss, style.css, and block.json'
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
            'render' => new RenderFileGenerator(),
            'view' => new ViewFileGenerator(),
            'style' => new StyleFileGenerator(),
            'css' => new CssFileGenerator(),
            'block_json' => new BlockJsonGenerator(),
            'symbol' => new SymbolFileGenerator(),
            'scss_partial' => new ScssPartialGenerator()
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