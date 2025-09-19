<?php

namespace Fanculo\Admin\Api\Security;

class InputValidator
{
    /**
     * Dangerous PHP functions that should be blocked
     */
    private static $dangerousFunctions = [
        'eval', 'exec', 'system', 'shell_exec', 'passthru', 'popen', 'proc_open',
        'file_get_contents', 'file_put_contents', 'fopen', 'fwrite', 'fputs',
        'include', 'include_once', 'require', 'require_once',
        'curl_exec', 'curl_multi_exec', 'mail', 'wp_mail',
        'unlink', 'rmdir', 'mkdir', 'chmod', 'chown',
        'base64_decode', 'gzinflate', 'str_rot13', 'convert_uuencode',
        'preg_replace', 'create_function', 'call_user_func', 'call_user_func_array'
    ];

    /**
     * Dangerous PHP patterns/keywords that should be blocked
     */
    private static $dangerousPatterns = [
        '/\$_GET\s*\[/', '/\$_POST\s*\[/', '/\$_REQUEST\s*\[/', '/\$_SERVER\s*\[/',
        '/\$_COOKIE\s*\[/', '/\$_SESSION\s*\[/', '/\$_FILES\s*\[/',
        '/\$GLOBALS\s*\[/', '/global\s+\$/',
        '/backticks/', '/`[^`]*`/',
        '/\<\?php/', '/\<\?=/', '/\<\%/', '/\%\>/',
        '/namespace\s+/', '/use\s+[^;]+;/',
        '/class\s+\w+/', '/function\s+\w+\s*\(/',
        '/new\s+\w+\s*\(/', '/instanceof\s+/',
        '/goto\s+/', '/exit\s*[;\(]/', '/die\s*[;\(]/',
        '/throw\s+new/', '/catch\s*\(/'
    ];

    /**
     * Validate and sanitize PHP code content
     */
    public static function validatePhpCode(string $code): array
    {
        $errors = [];
        $sanitizedCode = trim($code);

        // Check for empty code
        if (empty($sanitizedCode)) {
            return ['valid' => true, 'code' => '', 'errors' => []];
        }

        // Check for dangerous functions
        foreach (self::$dangerousFunctions as $function) {
            if (preg_match('/\b' . preg_quote($function, '/') . '\s*\(/i', $sanitizedCode)) {
                $errors[] = "Dangerous function '$function' is not allowed";
            }
        }

        // Check for dangerous patterns
        foreach (self::$dangerousPatterns as $pattern) {
            if (preg_match($pattern, $sanitizedCode)) {
                $errors[] = "Code contains dangerous pattern: " . $pattern;
            }
        }

        // Basic PHP syntax validation
        if (!empty($sanitizedCode)) {
            $syntaxCheck = self::validatePhpSyntax($sanitizedCode);
            if (!$syntaxCheck['valid']) {
                $errors[] = "PHP syntax error: " . $syntaxCheck['error'];
            }
        }

        $valid = empty($errors);

        // Log security events for blocked code
        if (!$valid) {
            PermissionValidator::logSecurityEvent('php_code_validation_failed', [
                'errors' => $errors,
                'code_preview' => substr($sanitizedCode, 0, 200)
            ]);
        }

        return [
            'valid' => $valid,
            'code' => $valid ? $sanitizedCode : '',
            'errors' => $errors
        ];
    }

    /**
     * Validate PHP syntax without executing code
     */
    private static function validatePhpSyntax(string $code): array
    {
        // Wrap code in PHP tags if not present for syntax checking
        $testCode = $code;
        if (!preg_match('/^\s*<\?php/', $testCode)) {
            $testCode = "<?php\n" . $testCode;
        }

        // Use php -l for syntax checking (lint mode)
        $tempFile = tempnam(sys_get_temp_dir(), 'fanculo_php_check');
        file_put_contents($tempFile, $testCode);

        $output = [];
        $returnCode = 0;
        exec("php -l " . escapeshellarg($tempFile) . " 2>&1", $output, $returnCode);

        unlink($tempFile);

        if ($returnCode === 0) {
            return ['valid' => true, 'error' => ''];
        } else {
            return ['valid' => false, 'error' => implode("\n", $output)];
        }
    }

    /**
     * Sanitize and validate SCSS content
     */
    public static function validateScssCode(string $scss): array
    {
        $sanitizedScss = trim($scss);

        // Basic SCSS validation - check for dangerous patterns
        $errors = [];

        // Check for potential code injection in SCSS
        if (preg_match('/\<\?php/', $sanitizedScss)) {
            $errors[] = "PHP code not allowed in SCSS";
        }

        if (preg_match('/\<script/', $sanitizedScss)) {
            $errors[] = "Script tags not allowed in SCSS";
        }

        // Validate SCSS syntax (basic check)
        if (!empty($sanitizedScss) && !self::isValidScss($sanitizedScss)) {
            $errors[] = "Invalid SCSS syntax detected";
        }

        $valid = empty($errors);

        return [
            'valid' => $valid,
            'code' => $valid ? $sanitizedScss : '',
            'errors' => $errors
        ];
    }

    /**
     * Basic SCSS syntax validation
     */
    private static function isValidScss(string $scss): bool
    {
        // Basic validation - check for balanced braces
        $braceCount = 0;
        $chars = str_split($scss);

        foreach ($chars as $char) {
            if ($char === '{') {
                $braceCount++;
            } elseif ($char === '}') {
                $braceCount--;
                if ($braceCount < 0) {
                    return false; // Unmatched closing brace
                }
            }
        }

        return $braceCount === 0; // All braces should be matched
    }

    /**
     * Sanitize and validate JavaScript content
     */
    public static function validateJsCode(string $js): array
    {
        $sanitizedJs = trim($js);
        $errors = [];

        // Check for dangerous patterns in JS
        if (preg_match('/eval\s*\(/', $sanitizedJs)) {
            $errors[] = "eval() function not allowed in JavaScript";
        }

        if (preg_match('/Function\s*\(/', $sanitizedJs)) {
            $errors[] = "Function constructor not allowed in JavaScript";
        }

        if (preg_match('/document\.write/', $sanitizedJs)) {
            $errors[] = "document.write not allowed";
        }

        if (preg_match('/\<script/', $sanitizedJs)) {
            $errors[] = "Script tags not allowed in JavaScript code";
        }

        $valid = empty($errors);

        return [
            'valid' => $valid,
            'code' => $valid ? $sanitizedJs : '',
            'errors' => $errors
        ];
    }

    /**
     * Validate and sanitize JSON content
     */
    public static function validateJsonContent(string $json): array
    {
        if (empty(trim($json))) {
            return ['valid' => true, 'data' => null, 'errors' => []];
        }

        $decoded = json_decode($json, true);
        $jsonError = json_last_error();

        if ($jsonError !== JSON_ERROR_NONE) {
            return [
                'valid' => false,
                'data' => null,
                'errors' => ['Invalid JSON: ' . json_last_error_msg()]
            ];
        }

        // Recursively sanitize JSON values
        $sanitizedData = self::sanitizeJsonData($decoded);

        return [
            'valid' => true,
            'data' => $sanitizedData,
            'errors' => []
        ];
    }

    /**
     * Recursively sanitize JSON data to prevent XSS
     */
    private static function sanitizeJsonData($data)
    {
        if (is_string($data)) {
            return sanitize_text_field($data);
        } elseif (is_array($data)) {
            return array_map([self::class, 'sanitizeJsonData'], $data);
        } elseif (is_object($data)) {
            $sanitized = new \stdClass();
            foreach ($data as $key => $value) {
                $sanitizedKey = sanitize_key($key);
                $sanitized->$sanitizedKey = self::sanitizeJsonData($value);
            }
            return $sanitized;
        }

        return $data; // Numbers, booleans, null
    }

    /**
     * Validate file path for security
     */
    public static function validateFilePath(string $filepath): array
    {
        $errors = [];

        // Check for path traversal attempts
        if (strpos($filepath, '..') !== false) {
            $errors[] = "Path traversal attempts not allowed";
        }

        if (strpos($filepath, '\\') !== false) {
            $errors[] = "Backslashes not allowed in file paths";
        }

        // Check for absolute paths outside allowed directory
        if (strpos($filepath, '/') === 0) {
            $errors[] = "Absolute paths not allowed";
        }

        // Check for dangerous file extensions
        $extension = pathinfo($filepath, PATHINFO_EXTENSION);
        $dangerousExtensions = ['php', 'phtml', 'php3', 'php4', 'php5', 'pht', 'exe', 'bat', 'sh'];

        if (in_array(strtolower($extension), $dangerousExtensions)) {
            $errors[] = "File extension '$extension' not allowed";
        }

        $valid = empty($errors);

        return [
            'valid' => $valid,
            'path' => $valid ? sanitize_file_name($filepath) : '',
            'errors' => $errors
        ];
    }

    /**
     * Validate array structure for batch operations
     */
    public static function validateBatchArray(array $data, int $maxItems = 50): array
    {
        $errors = [];

        if (count($data) > $maxItems) {
            $errors[] = "Batch operation exceeds maximum allowed items ($maxItems)";
        }

        if (empty($data)) {
            $errors[] = "Batch operation cannot be empty";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
}