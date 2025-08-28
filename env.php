<?php
/**
 * Development Environment Configuration
 * 
 * This file defines development-specific settings.
 * Delete this file in production to use production mode.
 */

return [
    'dev' => [
        'host' => 'localhost',
        'port' => 5179,
        'network_ip' => '192.168.0.58', // For CORS-free asset loading
    ]
];