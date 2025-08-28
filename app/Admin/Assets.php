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
    private ?int $detectedPort = null;

    public function __construct()
    {
        $this->isDev = $this->isDevMode();
        
        if ($this->isDev) {
            $this->loadDevConfig();
            $this->detectedPort = $this->detectVitePort();
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

    /**
     * Detect which port Vite is actually running on
     * Scans common Vite ports to find an active server
     */
    private function detectVitePort(): ?int
    {
        $commonPorts = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 3000, 3001];
        $host = $this->devConfig['host'] ?? 'localhost';
        
        foreach ($commonPorts as $port) {
            if ($this->isViteServerRunning($host, $port)) {
                return $port;
            }
        }
        
        return null;
    }

    /**
     * Check if Vite server is running on given host:port
     */
    private function isViteServerRunning(string $host, int $port): bool
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "http://{$host}:{$port}/@vite/client");
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return $httpCode === 200;
    }

    public function asset(string $entry): string
    {
        if ($this->isDev && $this->detectedPort) {
            // Development: Use detected port for dynamic loading
            $host = $this->devConfig['network_ip'] ?? 'localhost';
            return "http://{$host}:{$this->detectedPort}/{$entry}";
        }
        
        // Production: load built file
        if ($entry === 'src/main.tsx') {
            return FANCULO_URL . 'dist/main.js';
        }
        
        return '';
    }

    public function getDevScripts(): string
    {
        if (!$this->isDev || !$this->detectedPort) {
            return '';
        }
        
        $host = $this->devConfig['network_ip'] ?? 'localhost';
        $networkUrl = "http://{$host}:{$this->detectedPort}";
        
        $scripts = "<script type='module' src='{$networkUrl}/@vite/client'></script>";
        $scripts .= $this->getHotReloadScript($networkUrl);
        
        return $scripts;
    }

    /**
     * Get detected Vite port for debugging/logging
     */
    public function getDetectedPort(): ?int
    {
        return $this->detectedPort;
    }

    /**
     * Check if Vite development server is available
     */
    public function isViteAvailable(): bool
    {
        return $this->isDev && $this->detectedPort !== null;
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