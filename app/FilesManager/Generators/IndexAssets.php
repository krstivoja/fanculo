<?php

namespace Fanculo\FilesManager\Generators;

class IndexAssets
{
    public static function generate(string $blockDir): bool
    {
        $indexAssetPath = $blockDir . '/index.asset.php';
        $version = time() . wp_rand(100000, 999999);

        $content = '<?php' . "\n" .
            'return array(' . "\n" .
            '    \'dependencies\' => array(' . "\n" .
            '        \'wp-block-editor\',' . "\n" .
            '        \'wp-blocks\',' . "\n" .
            '        \'wp-element\',' . "\n" .
            '        \'wp-i18n\',' . "\n" .
            '        \'wp-server-side-render\'' . "\n" .
            '    ),' . "\n" .
            '    \'version\' => \'' . $version . '\'' . "\n" .
            ');';

        $result = file_put_contents($indexAssetPath, $content);

        return $result !== false;
    }
}