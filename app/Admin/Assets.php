<?php

namespace Fanculo\Admin;

/**
 * Assets
 * 
 * Handles asset loading for admin settings pages.
 * Automatically switches between development and production modes
 * based on the presence of env.php file.
 */
class Assets
{
    private bool $isDev;
    private array $devConfig;
    private string $devUrl;

    public function __construct()
    {
        $this->isDev = $this->isDevMode();
        
        if ($this->isDev) {
            $this->loadDevConfig();
        }
    }
    
    private function isDevMode(): bool
    {
        return file_exists(FANCULO_PATH . 'env.php');
    }
    
    private function loadDevConfig(): void
    {
        $config = require FANCULO_PATH . 'env.php';
        $this->devConfig = $config['dev'];
        $this->devUrl = "http://{$this->devConfig['host']}:{$this->devConfig['port']}";
    }

    public function asset(string $entry): string
    {
        if ($this->isDev) {
            // Development: Use network IP for CORS-free loading
            $networkUrl = "http://{$this->devConfig['network_ip']}:{$this->devConfig['port']}";
            return $networkUrl . '/' . $entry;
        }
        
        // Production: load built file
        if ($entry === 'src/main.tsx') {
            return FANCULO_URL . 'dist/main.js';
        }
        
        return '';
    }

    public function getDevScripts(): string
    {
        if (!$this->isDev) {
            return '';
        }
        
        $networkUrl = "http://{$this->devConfig['network_ip']}:{$this->devConfig['port']}";
        
        $scripts = "<script type='module' src='{$networkUrl}/@vite/client'></script>";
        $scripts .= $this->getHotReloadScript($networkUrl);
        
        return $scripts;
    }

    private function getHotReloadScript(string $networkUrl): string
    {
        return "
            <script type='module'>
                import RefreshRuntime from '{$networkUrl}/@react-refresh'
                RefreshRuntime.injectIntoGlobalHook(window)
                window.\$RefreshReg\$ = () => {}
                window.\$RefreshSig\$ = () => (type) => type
                window.__vite_plugin_react_preamble_installed__ = true
            </script>
        ";
    }
}