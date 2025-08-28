<?php

namespace GutenbergBlockStudio\App;

class Vite
{
    private $isDev;
    private $devServerUrl = 'http://localhost:5177';

    public function __construct()
    {
        $this->isDev = $this->isDevServerRunning();
    }

    private function isDevServerRunning(): bool
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->devServerUrl);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        // Debug output
        error_log("Fanculo Vite Debug: Checking {$this->devServerUrl}");
        error_log("Fanculo Vite Debug: HTTP Code: {$httpCode}");
        error_log("Fanculo Vite Debug: cURL Error: {$error}");
        
        return $httpCode === 200;
    }

    public function isDev(): bool
    {
        return $this->isDev;
    }

    public function asset(string $entry): string
    {
        if ($this->isDev) {
            return $this->devServerUrl . '/' . $entry;
        }

        // Production: use predictable names
        if ($entry === 'src/main.tsx') {
            return FANCULOWP_URL . 'dist/main.js';
        }

        return '';
    }

    public function getCSSAssets(): array
    {
        if ($this->isDev) {
            // In dev mode, CSS is injected automatically by Vite
            return [];
        }

        // Production: predictable CSS file
        $cssFile = FANCULOWP_PATH . 'dist/assets/index.css';
        if (file_exists($cssFile)) {
            return [FANCULOWP_URL . 'dist/assets/index.css'];
        }

        return [];
    }

    public function reactRefresh(): string
    {
        if (!$this->isDev) {
            return '';
        }

        return "
            <script type='module'>
                import RefreshRuntime from '{$this->devServerUrl}/@react-refresh'
                RefreshRuntime.injectIntoGlobalHook(window)
                window.\$RefreshReg\$ = () => {}
                window.\$RefreshSig\$ = () => (type) => type
                window.__vite_plugin_react_preamble_installed__ = true
            </script>
        ";
    }

    public function client(): string
    {
        return $this->isDev ? "<script type='module' src='{$this->devServerUrl}/@vite/client'></script>" : '';
    }
}