<?php

namespace Fanculo\Admin\Api\Services;

/**
 * Centralized Sanitization Service
 *
 * Provides standardized sanitization and validation methods for all data types
 * used throughout the Fanculo plugin. Ensures consistent security practices
 * and reduces code duplication across API controllers and data layers.
 */
class SanitizationService
{
    /**
     * Dangerous PHP functions that should be blocked
     */
    private const DANGEROUS_PHP_FUNCTIONS = [
        'eval', 'exec', 'system', 'shell_exec', 'passthru',
        'file_get_contents', 'file_put_contents', 'fopen', 'fwrite',
        'unlink', 'rmdir', 'mysqli_connect', 'mysql_connect',
        'curl_exec', 'include', 'require', 'include_once', 'require_once'
    ];

    /**
     * Maximum lengths for different content types
     */
    private const MAX_LENGTHS = [
        'title' => 255,
        'description' => 500,
        'meta_key' => 100,
        'meta_value' => 10000,
        'code' => 50000,
        'json' => 20000,
        'slug' => 100,
        'url' => 2000,
        'email' => 320
    ];

    /**
     * Sanitize text input with context-specific rules
     *
     * @param mixed $value Value to sanitize
     * @param string $context Context for sanitization (title, description, etc.)
     * @param array $options Additional sanitization options
     * @return string Sanitized value
     */
    public function sanitizeText($value, string $context = 'default', array $options = []): string
    {
        if (!is_string($value) && !is_numeric($value)) {
            return '';
        }

        $value = (string) $value;

        // Apply length limits based on context
        if (isset(self::MAX_LENGTHS[$context])) {
            $value = substr($value, 0, self::MAX_LENGTHS[$context]);
        }

        switch ($context) {
            case 'title':
                return sanitize_text_field($value);

            case 'description':
            case 'textarea':
                return sanitize_textarea_field($value);

            case 'key':
            case 'slug':
                return sanitize_key($value);

            case 'email':
                return sanitize_email($value);

            case 'url':
                return esc_url_raw($value);

            case 'html':
                $allowed_html = $options['allowed_html'] ?? [];
                return wp_kses($value, $allowed_html);

            default:
                return sanitize_text_field($value);
        }
    }

    /**
     * Sanitize integer values with range validation
     *
     * @param mixed $value Value to sanitize
     * @param int|null $min Minimum allowed value
     * @param int|null $max Maximum allowed value
     * @return int Sanitized integer value
     */
    public function sanitizeInteger($value, ?int $min = null, ?int $max = null): int
    {
        $value = absint($value);

        if ($min !== null && $value < $min) {
            $value = $min;
        }

        if ($max !== null && $value > $max) {
            $value = $max;
        }

        return $value;
    }

    /**
     * Sanitize boolean values
     *
     * @param mixed $value Value to sanitize
     * @return bool Sanitized boolean value
     */
    public function sanitizeBoolean($value): bool
    {
        return rest_sanitize_boolean($value);
    }

    /**
     * Sanitize array with validation for each element
     *
     * @param mixed $value Value to sanitize
     * @param string $element_type Type of elements in array
     * @param array $options Additional options for element sanitization
     * @return array Sanitized array
     */
    public function sanitizeArray($value, string $element_type = 'text', array $options = []): array
    {
        if (!is_array($value)) {
            return [];
        }

        $sanitized = [];
        $max_elements = $options['max_elements'] ?? 100;
        $count = 0;

        foreach ($value as $key => $element) {
            if ($count >= $max_elements) {
                break;
            }

            $sanitized_key = $this->sanitizeText($key, 'key');

            switch ($element_type) {
                case 'integer':
                    $sanitized[$sanitized_key] = $this->sanitizeInteger($element);
                    break;
                case 'boolean':
                    $sanitized[$sanitized_key] = $this->sanitizeBoolean($element);
                    break;
                case 'array':
                    $sanitized[$sanitized_key] = $this->sanitizeArray($element, $options['nested_type'] ?? 'text', $options);
                    break;
                default:
                    $sanitized[$sanitized_key] = $this->sanitizeText($element, $element_type, $options);
            }

            $count++;
        }

        return $sanitized;
    }

    /**
     * Sanitize JSON data with validation
     *
     * @param mixed $value Value to sanitize
     * @param array $options Validation options
     * @return string Sanitized JSON string
     */
    public function sanitizeJson($value, array $options = []): string
    {
        if (is_string($value)) {
            // Validate existing JSON
            $decoded = json_decode($value, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return '{}';
            }
            $value = $decoded;
        }

        if (!is_array($value) && !is_object($value)) {
            return '{}';
        }

        // Convert to array for sanitization
        if (is_object($value)) {
            $value = (array) $value;
        }

        // Sanitize the data structure
        $sanitized = $this->sanitizeJsonData($value, $options);

        // Encode back to JSON
        $json = wp_json_encode($sanitized);

        // Apply length limit
        $max_length = $options['max_length'] ?? self::MAX_LENGTHS['json'];
        if (strlen($json) > $max_length) {
            return '{}';
        }

        return $json;
    }

    /**
     * Recursively sanitize JSON data structure
     *
     * @param array $data Data to sanitize
     * @param array $options Sanitization options
     * @param int $depth Current recursion depth
     * @return array Sanitized data
     */
    private function sanitizeJsonData(array $data, array $options = [], int $depth = 0): array
    {
        $max_depth = $options['max_depth'] ?? 5;
        if ($depth > $max_depth) {
            return [];
        }

        $sanitized = [];
        $max_elements = $options['max_elements'] ?? 50;
        $count = 0;

        foreach ($data as $key => $value) {
            if ($count >= $max_elements) {
                break;
            }

            $sanitized_key = $this->sanitizeText($key, 'key');

            if (is_array($value)) {
                $sanitized[$sanitized_key] = $this->sanitizeJsonData($value, $options, $depth + 1);
            } elseif (is_string($value)) {
                $sanitized[$sanitized_key] = $this->sanitizeText($value, 'textarea');
            } elseif (is_numeric($value)) {
                $sanitized[$sanitized_key] = is_float($value) ? (float) $value : $this->sanitizeInteger($value);
            } elseif (is_bool($value)) {
                $sanitized[$sanitized_key] = $value;
            } else {
                // Skip unsupported types
                continue;
            }

            $count++;
        }

        return $sanitized;
    }

    /**
     * Sanitize PHP code with security validation
     *
     * @param string $code PHP code to sanitize
     * @param array $options Validation options
     * @return string Sanitized PHP code or empty string if dangerous
     */
    public function sanitizePhpCode(string $code, array $options = []): string
    {
        // Apply length limit
        if (strlen($code) > self::MAX_LENGTHS['code']) {
            return '';
        }

        // Check for dangerous functions
        if ($this->containsDangerousPhp($code)) {
            return '';
        }

        // Allow basic syntax validation if enabled
        if ($options['validate_syntax'] ?? false) {
            if (!$this->isValidPhpSyntax($code)) {
                return '';
            }
        }

        // Return unslashed code (WordPress adds slashes)
        return wp_unslash($code);
    }

    /**
     * Sanitize SCSS/CSS code
     *
     * @param string $code SCSS/CSS code to sanitize
     * @return string Sanitized code
     */
    public function sanitizeScssCode(string $code): string
    {
        // Apply length limit
        if (strlen($code) > self::MAX_LENGTHS['code']) {
            return '';
        }

        // Basic sanitization for SCSS/CSS
        return sanitize_textarea_field($code);
    }

    /**
     * Sanitize JavaScript code
     *
     * @param string $code JavaScript code to sanitize
     * @return string Sanitized code
     */
    public function sanitizeJsCode(string $code): string
    {
        // Apply length limit
        if (strlen($code) > self::MAX_LENGTHS['code']) {
            return '';
        }

        // Basic sanitization for JavaScript
        return sanitize_textarea_field($code);
    }

    /**
     * Sanitize post meta data with context-aware rules
     *
     * @param array $meta_data Meta data to sanitize
     * @param string $post_type Post type context
     * @return array Sanitized meta data
     */
    public function sanitizePostMeta(array $meta_data, string $post_type = ''): array
    {
        $sanitized = [];

        foreach ($meta_data as $key => $value) {
            $sanitized_key = $this->sanitizeText($key, 'key');

            // Context-specific sanitization based on meta key patterns
            if (strpos($key, '_php') !== false) {
                $sanitized[$sanitized_key] = $this->sanitizePhpCode($value);
            } elseif (strpos($key, '_scss') !== false) {
                $sanitized[$sanitized_key] = $this->sanitizeScssCode($value);
            } elseif (strpos($key, '_js') !== false) {
                $sanitized[$sanitized_key] = $this->sanitizeJsCode($value);
            } elseif (strpos($key, '_settings') !== false || strpos($key, '_attributes') !== false) {
                $sanitized[$sanitized_key] = $this->sanitizeJson($value);
            } elseif (is_array($value)) {
                $sanitized[$sanitized_key] = $this->sanitizeArray($value);
            } else {
                $sanitized[$sanitized_key] = $this->sanitizeText($value, 'textarea');
            }
        }

        return $sanitized;
    }

    /**
     * Check if PHP code contains dangerous patterns
     *
     * @param string $code PHP code to check
     * @return bool True if dangerous patterns found
     */
    private function containsDangerousPhp(string $code): bool
    {
        foreach (self::DANGEROUS_PHP_FUNCTIONS as $function) {
            if (preg_match('/\b' . preg_quote($function, '/') . '\s*\(/i', $code)) {
                return true;
            }
        }

        // Check for dangerous patterns
        $dangerous_patterns = [
            '/\$_GET\s*\[/',
            '/\$_POST\s*\[/',
            '/\$_REQUEST\s*\[/',
            '/\$_COOKIE\s*\[/',
            '/\$_SERVER\s*\[/',
            '/\$_ENV\s*\[/',
            '/\$GLOBALS\s*\[/',
            '/eval\s*\(/',
            '/base64_decode\s*\(/',
            '/gzinflate\s*\(/',
            '/str_rot13\s*\(/',
        ];

        foreach ($dangerous_patterns as $pattern) {
            if (preg_match($pattern, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Basic PHP syntax validation
     *
     * @param string $code PHP code to validate
     * @return bool True if syntax is valid
     */
    private function isValidPhpSyntax(string $code): bool
    {
        // Basic syntax check - look for obvious issues
        $open_php_tags = substr_count($code, '<?php');
        $close_php_tags = substr_count($code, '?>');

        // Must not have more opening tags than closing (or equal if no closing tags)
        if ($open_php_tags > 1 || ($close_php_tags > 0 && $open_php_tags !== $close_php_tags)) {
            return false;
        }

        // Check for balanced brackets (basic check)
        $open_braces = substr_count($code, '{');
        $close_braces = substr_count($code, '}');
        $open_parens = substr_count($code, '(');
        $close_parens = substr_count($code, ')');
        $open_brackets = substr_count($code, '[');
        $close_brackets = substr_count($code, ']');

        return $open_braces === $close_braces &&
               $open_parens === $close_parens &&
               $open_brackets === $close_brackets;
    }

    /**
     * Escape data for HTML output
     *
     * @param mixed $value Value to escape
     * @param string $context Output context
     * @return string Escaped value
     */
    public function escapeForOutput($value, string $context = 'html'): string
    {
        if (!is_string($value) && !is_numeric($value)) {
            return '';
        }

        $value = (string) $value;

        switch ($context) {
            case 'attr':
                return esc_attr($value);
            case 'url':
                return esc_url($value);
            case 'js':
                return esc_js($value);
            case 'textarea':
                return esc_textarea($value);
            case 'html':
            default:
                return esc_html($value);
        }
    }
}