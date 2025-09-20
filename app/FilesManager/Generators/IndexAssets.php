<?php

namespace Fanculo\FilesManager\Generators;

class IndexAssets
{
    public static function generate(string $blockDir): bool
    {
        $indexAssetPath = $blockDir . '/index.asset.php';
        
        $version = time() . wp_rand(100000, 999999);

        $content = '<?php return array( "dependencies" => array( "wp-block-editor", "wp-blocks", "wp-element", "wp-i18n", "wp-server-side-render" ), "version" => "' . $version . '" );';

        $result = file_put_contents($indexAssetPath, $content);

        return $result !== false;
    }
}