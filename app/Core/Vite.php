<?php

namespace Fanculo\Core;

class Vite
{
    private bool $isDev;
    private int $devPort = 5177;
    private string $devHost = 'localhost';
    private string $devUrl;

    public function __construct()
    {
        $this->devUrl = "http://{$this->devHost}:{$this->devPort}";
        $this->isDev = $this->isDevServerRunning();
    }

    private function isDevServerRunning(): bool
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->devUrl . '/@vite/client');
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return $httpCode === 200;
    }

    public function asset(string $entry): string
    {
        if ($this->isDev) {
            // Use dev server
            return $this->devUrl . '/' . $entry;
        }
        
        // Production: load built file
        if ($entry === 'src/main.tsx') {
            return FANCULO_URL . 'dist/main.js';
        }
        
        return '';
    }

    public function client(): string
    {
        return $this->isDev ? "<script type='module' src='{$this->devUrl}/@vite/client'></script>" : '';
    }

    public function reactRefresh(): string
    {
        if (!$this->isDev) {
            return '';
        }
        
        return "
            <script type='module'>
                import RefreshRuntime from '{$this->devUrl}/@react-refresh'
                RefreshRuntime.injectIntoGlobalHook(window)
                window.\$RefreshReg\$ = () => {}
                window.\$RefreshSig\$ = () => (type) => type
                window.__vite_plugin_react_preamble_installed__ = true
            </script>
        ";
    }
}
