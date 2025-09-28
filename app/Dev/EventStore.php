<?php

namespace Fanculo\Dev;

/**
 * Event Store for Hot Reload Development
 * JSONL-based event logging with file locking and size management
 */
class EventStore
{
    private const LOG_FILE = 'events.log';
    private const MAX_EVENTS = 200;
    private const DEV_DIR = 'fanculo-dev';

    private $logPath;
    private $devDir;

    public function __construct()
    {
        $this->setupPaths();
        $this->ensureDirectoryExists();
    }

    /**
     * Setup file paths
     */
    private function setupPaths(): void
    {
        $uploadsDir = wp_upload_dir();
        $this->devDir = trailingslashit($uploadsDir['basedir']) . self::DEV_DIR;
        $this->logPath = trailingslashit($this->devDir) . self::LOG_FILE;
    }

    /**
     * Ensure dev directory exists
     */
    private function ensureDirectoryExists(): void
    {
        if (!file_exists($this->devDir)) {
            wp_mkdir_p($this->devDir);
        }

        // Add .htaccess to protect log files
        $htaccessPath = trailingslashit($this->devDir) . '.htaccess';
        if (!file_exists($htaccessPath)) {
            file_put_contents($htaccessPath, "Deny from all\n");
        }
    }

    /**
     * Append new event to log
     */
    public function append(string $type, array $payload): int
    {
        $eventId = $this->getNextEventId();
        $event = [
            'id' => $eventId,
            'type' => $type,
            'timestamp' => microtime(true),
            'payload' => $payload
        ];

        $jsonLine = wp_json_encode($event) . "\n";

        // Use file locking for thread safety
        $handle = fopen($this->logPath, 'a');
        if (!$handle) {
            error_log("Fanculo Dev: Failed to open event log for writing: {$this->logPath}");
            return $eventId;
        }

        if (flock($handle, LOCK_EX)) {
            fwrite($handle, $jsonLine);
            flock($handle, LOCK_UN);
        } else {
            error_log("Fanculo Dev: Failed to acquire lock on event log");
        }

        fclose($handle);

        // Manage log size
        $this->truncateIfNeeded();

        error_log("Fanculo Dev: Event recorded - {$type} (ID: {$eventId})");
        return $eventId;
    }

    /**
     * Fetch events since a specific ID
     */
    public function fetchSince(int $lastId = 0): array
    {
        if (!file_exists($this->logPath)) {
            return [];
        }

        $events = [];
        $handle = fopen($this->logPath, 'r');
        if (!$handle) {
            return [];
        }

        if (flock($handle, LOCK_SH)) {
            while (($line = fgets($handle)) !== false) {
                $event = json_decode(trim($line), true);
                if ($event && isset($event['id']) && $event['id'] > $lastId) {
                    $events[] = $event;
                }
            }
            flock($handle, LOCK_UN);
        }

        fclose($handle);
        return $events;
    }

    /**
     * Get the next event ID
     */
    private function getNextEventId(): int
    {
        $lastEvent = $this->getLastEvent();
        return $lastEvent ? ($lastEvent['id'] + 1) : 1;
    }

    /**
     * Get the last event from the log
     */
    private function getLastEvent(): ?array
    {
        if (!file_exists($this->logPath)) {
            return null;
        }

        $handle = fopen($this->logPath, 'r');
        if (!$handle) {
            return null;
        }

        $lastEvent = null;
        if (flock($handle, LOCK_SH)) {
            // Read from end of file to get last line efficiently
            fseek($handle, -1, SEEK_END);
            $char = '';
            $line = '';

            // Read backwards until we find a complete line
            while (ftell($handle) > 0) {
                $char = fgetc($handle);
                if ($char === "\n" && !empty($line)) {
                    break;
                }
                $line = $char . $line;
                fseek($handle, -2, SEEK_CUR);
            }

            if (!empty($line)) {
                $lastEvent = json_decode(trim($line), true);
            }

            flock($handle, LOCK_UN);
        }

        fclose($handle);
        return $lastEvent;
    }

    /**
     * Truncate log if it exceeds max events
     */
    private function truncateIfNeeded(): void
    {
        if (!file_exists($this->logPath)) {
            return;
        }

        $events = [];
        $handle = fopen($this->logPath, 'r');
        if (!$handle) {
            return;
        }

        if (flock($handle, LOCK_SH)) {
            while (($line = fgets($handle)) !== false) {
                $event = json_decode(trim($line), true);
                if ($event) {
                    $events[] = $event;
                }
            }
            flock($handle, LOCK_UN);
        }
        fclose($handle);

        if (count($events) <= self::MAX_EVENTS) {
            return;
        }

        // Keep only the last MAX_EVENTS
        $events = array_slice($events, -self::MAX_EVENTS);

        // Rewrite the file
        $handle = fopen($this->logPath, 'w');
        if (!$handle) {
            return;
        }

        if (flock($handle, LOCK_EX)) {
            foreach ($events as $event) {
                fwrite($handle, wp_json_encode($event) . "\n");
            }
            flock($handle, LOCK_UN);
        }
        fclose($handle);

        error_log("Fanculo Dev: Event log truncated to " . count($events) . " events");
    }

    /**
     * Clear all events (for testing/debugging)
     */
    public function truncate(): bool
    {
        if (file_exists($this->logPath)) {
            return unlink($this->logPath);
        }
        return true;
    }

    /**
     * Get event count
     */
    public function getEventCount(): int
    {
        if (!file_exists($this->logPath)) {
            return 0;
        }

        $count = 0;
        $handle = fopen($this->logPath, 'r');
        if ($handle) {
            while (fgets($handle) !== false) {
                $count++;
            }
            fclose($handle);
        }

        return $count;
    }

    /**
     * Get log file path (for debugging)
     */
    public function getLogPath(): string
    {
        return $this->logPath;
    }
}