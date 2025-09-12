<?php

namespace Marko\Fanculo;

class ViteAssets
{
    private $manifest = null;
    private $isDev = false;
    private $devServerUrl = 'http://localhost:3002';

    public function __construct()
    {
        $this->isDev = $this->isDevMode() && $this->isDevServerRunning();
        if (!$this->isDev) {
            $this->loadManifest();
        }
    }

    private function isDevMode()
    {
        $envPath = plugin_dir_path(__DIR__) . '.env';
        if (file_exists($envPath)) {
            $envContent = file_get_contents($envPath);
            return strpos($envContent, 'FANCULO_DEV_MODE=true') !== false;
        }
        return false;
    }

    private function isDevServerRunning()
    {
        // Get WordPress site URL and use same host for dev server
        $siteUrl = parse_url(site_url());
        $host = $siteUrl['host'];
        $scheme = $siteUrl['scheme'];
        
        $devServerUrl = $scheme . '://' . $host . ':3002';
        
        // Try WordPress host first, then fallbacks
        $urls = [
            $devServerUrl,
            $this->devServerUrl // original localhost fallback
        ];
        
        foreach ($urls as $url) {
            error_log('ViteAssets Debug: Trying URL: ' . $url);
            
            // Test the actual asset path, not the root
            $testUrl = $url . '/src/main.js';
            $ch = curl_init($testUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            $result = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            error_log('ViteAssets Debug: Testing asset URL: ' . $testUrl . ' - HTTP Code: ' . $httpCode);
            
            if ($result !== false && $httpCode === 200) {
                $this->devServerUrl = $url; // Update to working URL
                error_log('ViteAssets Debug: Found working dev server at: ' . $url);
                return true;
            }
        }
        
        return false;
    }

    private function loadManifest()
    {
        $manifestPath = plugin_dir_path(__DIR__) . 'dist/.vite/manifest.json';
        if (file_exists($manifestPath)) {
            $this->manifest = json_decode(file_get_contents($manifestPath), true);
        }
    }

    public function enqueueAssets($handle = 'fanculo-app')
    {
        // Debug logging
        error_log('ViteAssets Debug: isDev=' . ($this->isDev ? 'true' : 'false'));
        error_log('ViteAssets Debug: devServerUrl=' . $this->devServerUrl);
        error_log('ViteAssets Debug: isDevMode=' . ($this->isDevMode() ? 'true' : 'false'));
        error_log('ViteAssets Debug: isDevServerRunning=' . ($this->isDevServerRunning() ? 'true' : 'false'));
        
        if ($this->isDev) {
            wp_enqueue_script(
                $handle,
                $this->devServerUrl . '/src/main.js',
                [],
                null,
                true
            );
            
            // Add Vite client for HMR
            wp_enqueue_script(
                $handle . '-vite-client',
                $this->devServerUrl . '/@vite/client',
                [],
                null,
                false
            );
            
            // Add module attribute
            add_filter('script_loader_tag', [$this, 'addModuleAttribute'], 10, 3);
        } else {
            if ($this->manifest && isset($this->manifest['src/main.js'])) {
                $entry = $this->manifest['src/main.js'];
                
                wp_enqueue_script(
                    $handle,
                    plugin_dir_url(__DIR__) . 'dist/' . $entry['file'],
                    [],
                    null,
                    true
                );
                
                // Enqueue CSS if exists
                if (isset($entry['css'])) {
                    foreach ($entry['css'] as $css) {
                        wp_enqueue_style(
                            $handle . '-css',
                            plugin_dir_url(__DIR__) . 'dist/' . $css,
                            [],
                            null
                        );
                    }
                }
            }
        }
    }

    public function addModuleAttribute($tag, $handle, $src)
    {
        if (strpos($handle, 'fanculo') !== false) {
            $tag = str_replace('<script ', '<script type="module" ', $tag);
        }
        return $tag;
    }
}