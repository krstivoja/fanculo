<?php

namespace Fanculo\Admin\Api\Security;

class RateLimiter
{
    private static $limits = [
        'file_generation' => [
            'max_requests' => 5,
            'time_window' => 300 // 5 minutes
        ],
        'api_general' => [
            'max_requests' => 100,
            'time_window' => 60 // 1 minute
        ]
    ];

    /**
     * Check if user has exceeded rate limit for a specific action
     */
    public static function checkRateLimit(string $action, ?int $userId = null): array
    {
        if (!isset(self::$limits[$action])) {
            return ['allowed' => true, 'remaining' => 999];
        }

        $limit = self::$limits[$action];
        $userId = $userId ?? get_current_user_id();
        $key = "fanculo_rate_limit_{$action}_{$userId}";

        // Get current requests from transient
        $requests = get_transient($key) ?: [];
        $now = time();

        // Remove old requests outside the time window
        $requests = array_filter($requests, function($timestamp) use ($now, $limit) {
            return ($now - $timestamp) < $limit['time_window'];
        });

        $currentCount = count($requests);

        if ($currentCount >= $limit['max_requests']) {
            PermissionValidator::logSecurityEvent('rate_limit_exceeded', [
                'action' => $action,
                'user_id' => $userId,
                'current_count' => $currentCount,
                'max_requests' => $limit['max_requests'],
                'time_window' => $limit['time_window']
            ]);

            return [
                'allowed' => false,
                'remaining' => 0,
                'reset_time' => min($requests) + $limit['time_window']
            ];
        }

        // Add current request
        $requests[] = $now;
        set_transient($key, $requests, $limit['time_window']);

        return [
            'allowed' => true,
            'remaining' => $limit['max_requests'] - count($requests)
        ];
    }

    /**
     * Get rate limit status without incrementing counter
     */
    public static function getRateLimitStatus(string $action, ?int $userId = null): array
    {
        if (!isset(self::$limits[$action])) {
            return ['remaining' => 999, 'max_requests' => 999];
        }

        $limit = self::$limits[$action];
        $userId = $userId ?? get_current_user_id();
        $key = "fanculo_rate_limit_{$action}_{$userId}";

        $requests = get_transient($key) ?: [];
        $now = time();

        // Remove old requests
        $requests = array_filter($requests, function($timestamp) use ($now, $limit) {
            return ($now - $timestamp) < $limit['time_window'];
        });

        return [
            'remaining' => max(0, $limit['max_requests'] - count($requests)),
            'max_requests' => $limit['max_requests'],
            'time_window' => $limit['time_window']
        ];
    }

    /**
     * Clear rate limit for a user (admin function)
     */
    public static function clearRateLimit(string $action, int $userId): bool
    {
        $key = "fanculo_rate_limit_{$action}_{$userId}";
        return delete_transient($key);
    }

    /**
     * Set custom rate limit (admin function)
     */
    public static function setRateLimit(string $action, int $maxRequests, int $timeWindow): void
    {
        self::$limits[$action] = [
            'max_requests' => $maxRequests,
            'time_window' => $timeWindow
        ];
    }
}