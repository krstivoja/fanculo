<?php

namespace Fanculo\Services;

use Fanculo\Dev\EventStore;

/**
 * Development Reload Manager
 * Static helper wrapper around the new EventStore for hot reload functionality
 */
class DevReloadManager
{
    private static $eventStore = null;

    /**
     * Get or create event store instance
     */
    private static function getEventStore(): EventStore
    {
        if (self::$eventStore === null) {
            self::$eventStore = new EventStore();
        }
        return self::$eventStore;
    }

    /**
     * Check if dev mode is enabled
     */
    public static function isDevMode(): bool
    {
        // Use WordPress environment type detection
        if (function_exists('wp_get_environment_type')) {
            $envType = wp_get_environment_type();
            return in_array($envType, ['development', 'local'], true);
        }

        // Fallback: check for dev indicators
        return defined('WP_DEBUG') && WP_DEBUG;
    }

    /**
     * Record a block update event
     */
    public static function recordBlockUpdated(string $slug, int $postId = 0): void
    {
        if (!self::isDevMode()) {
            error_log("Fanculo DevReloadManager: Not in dev mode, skipping event recording");
            return;
        }

        error_log("Fanculo DevReloadManager: Recording block_updated event for slug: {$slug}, postId: {$postId}");

        $eventId = self::getEventStore()->append('block_updated', [
            'slug' => $slug,
            'post_id' => $postId,
            'message' => "Block '{$slug}' updated"
        ]);

        error_log("Fanculo DevReloadManager: Event recorded with ID: {$eventId}");
    }

    /**
     * Record a symbol update event
     */
    public static function recordSymbolUpdated(string $slug): void
    {
        if (!self::isDevMode()) {
            return;
        }

        self::getEventStore()->append('symbol_updated', [
            'slug' => $slug,
            'message' => "Symbol '{$slug}' updated"
        ]);
    }

    /**
     * Record styles update event
     */
    public static function recordStylesUpdated(string $message = 'Styles updated'): void
    {
        if (!self::isDevMode()) {
            return;
        }

        self::getEventStore()->append('styles_updated', [
            'message' => $message
        ]);
    }

    /**
     * Record SCSS partial update event
     */
    public static function recordScssUpdated(string $slug): void
    {
        if (!self::isDevMode()) {
            return;
        }

        self::getEventStore()->append('scss_updated', [
            'slug' => $slug,
            'message' => "SCSS partial '{$slug}' updated"
        ]);
    }

    /**
     * Record error event
     */
    public static function recordError(string $message, array $context = []): void
    {
        if (!self::isDevMode()) {
            return;
        }

        self::getEventStore()->append('error', [
            'message' => $message,
            'context' => $context
        ]);
    }

    /**
     * Record generic event
     */
    public static function recordEvent(string $type, array $payload): void
    {
        if (!self::isDevMode()) {
            return;
        }

        self::getEventStore()->append($type, $payload);
    }

    /**
     * Get events since a specific ID
     */
    public static function getEventsSince(int $lastId): array
    {
        if (!self::isDevMode()) {
            return [];
        }

        return self::getEventStore()->fetchSince($lastId);
    }

    /**
     * Get development status
     */
    public static function getDevStatus(): array
    {
        $isDevMode = self::isDevMode();

        if (!$isDevMode) {
            return [
                'dev_mode' => false,
                'environment' => wp_get_environment_type(),
                'message' => 'Hot reload is only available in development environment'
            ];
        }

        $eventStore = self::getEventStore();

        return [
            'dev_mode' => true,
            'environment' => wp_get_environment_type(),
            'event_count' => $eventStore->getEventCount(),
            'log_path' => $eventStore->getLogPath(),
            'server_time' => microtime(true)
        ];
    }

    /**
     * Clear all events (for testing/debugging)
     */
    public static function clearEvents(): bool
    {
        if (!self::isDevMode()) {
            return false;
        }

        return self::getEventStore()->truncate();
    }

    /**
     * Get event store instance (for advanced usage)
     */
    public static function getEventStoreInstance(): ?EventStore
    {
        if (!self::isDevMode()) {
            return null;
        }

        return self::getEventStore();
    }
}