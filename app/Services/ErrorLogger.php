<?php

namespace FanCoolo\Services;

/**
 * Centralized error logging service for FanCoolo plugin
 *
 * Only logs actual errors - no debug or info messages
 */
class ErrorLogger
{
    /**
     * Log an error message
     *
     * @param string $message Error message
     * @param string $context Optional context (e.g., 'App', 'LicenseManager')
     * @param \Throwable|null $exception Optional exception for stack trace
     */
    public static function log(string $message, string $context = '', ?\Throwable $exception = null): void
    {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }

        $prefix = 'FanCoolo Error';
        if ($context) {
            $prefix .= " [{$context}]";
        }

        $logMessage = sprintf('%s: %s', $prefix, $message);

        if ($exception) {
            $logMessage .= sprintf(
                "\nException: %s\nStack trace:\n%s",
                $exception->getMessage(),
                $exception->getTraceAsString()
            );
        }

        error_log($logMessage);
    }

    /**
     * Log a critical error that prevents plugin functionality
     *
     * @param string $message Error message
     * @param string $context Optional context
     * @param \Throwable|null $exception Optional exception
     */
    public static function critical(string $message, string $context = '', ?\Throwable $exception = null): void
    {
        $prefix = 'FanCoolo CRITICAL';
        if ($context) {
            $prefix .= " [{$context}]";
        }

        $logMessage = sprintf('%s: %s', $prefix, $message);

        if ($exception) {
            $logMessage .= sprintf(
                "\nException: %s\nStack trace:\n%s",
                $exception->getMessage(),
                $exception->getTraceAsString()
            );
        }

        error_log($logMessage);
    }
}
