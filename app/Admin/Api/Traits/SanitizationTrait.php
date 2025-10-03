<?php

namespace FanCoolo\Admin\Api\Traits;

use FanCoolo\Admin\Api\Services\SanitizationService;

/**
 * Sanitization Trait
 *
 * Provides easy access to standardized sanitization methods for API controllers.
 * Ensures consistent sanitization patterns across all controllers and reduces
 * code duplication while maintaining security best practices.
 */
trait SanitizationTrait
{
    /**
     * Sanitization service instance
     *
     * @var SanitizationService|null
     */
    private $sanitizationService;

    /**
     * Get sanitization service instance
     *
     * @return SanitizationService
     */
    protected function getSanitizationService(): SanitizationService
    {
        if ($this->sanitizationService === null) {
            $this->sanitizationService = new SanitizationService();
        }

        return $this->sanitizationService;
    }

    /**
     * Get standardized sanitization callbacks for REST API route arguments
     *
     * @return array Array of common sanitization callbacks
     */
    protected function getStandardSanitizationCallbacks(): array
    {
        $service = $this->getSanitizationService();

        return [
            'text' => [$service, 'sanitizeText'],
            'title' => function($value) use ($service) {
                return $service->sanitizeText($value, 'title');
            },
            'description' => function($value) use ($service) {
                return $service->sanitizeText($value, 'description');
            },
            'slug' => function($value) use ($service) {
                return $service->sanitizeText($value, 'slug');
            },
            'email' => function($value) use ($service) {
                return $service->sanitizeText($value, 'email');
            },
            'url' => function($value) use ($service) {
                return $service->sanitizeText($value, 'url');
            },
            'integer' => [$service, 'sanitizeInteger'],
            'positive_integer' => function($value) use ($service) {
                return $service->sanitizeInteger($value, 1);
            },
            'per_page_limited' => function($value) use ($service) {
                return $service->sanitizeInteger($value, 1, 100);
            },
            'boolean' => [$service, 'sanitizeBoolean'],
            'array' => [$service, 'sanitizeArray'],
            'json' => [$service, 'sanitizeJson'],
            'php_code' => [$service, 'sanitizePhpCode'],
            'scss_code' => [$service, 'sanitizeScssCode'],
            'js_code' => [$service, 'sanitizeJsCode'],
        ];
    }

    /**
     * Get standardized validation rules for common parameters
     *
     * @return array Array of validation rules with sanitization
     */
    protected function getStandardValidationRules(): array
    {
        $callbacks = $this->getStandardSanitizationCallbacks();

        return [
            'title' => [
                'type' => 'string',
                'required' => true,
                'sanitize_callback' => $callbacks['title'],
                'validate_callback' => function($param) {
                    return !empty(trim($param)) && strlen($param) <= 255;
                }
            ],
            'description' => [
                'type' => 'string',
                'sanitize_callback' => $callbacks['description'],
                'validate_callback' => function($param) {
                    return strlen($param) <= 500;
                }
            ],
            'slug' => [
                'type' => 'string',
                'sanitize_callback' => $callbacks['slug'],
                'validate_callback' => function($param) {
                    return preg_match('/^[a-z0-9-]+$/', $param) && strlen($param) <= 100;
                }
            ],
            'search' => [
                'type' => 'string',
                'default' => '',
                'sanitize_callback' => $callbacks['text'],
                'validate_callback' => function($param) {
                    return strlen($param) <= 100;
                }
            ],
            'per_page' => [
                'type' => 'integer',
                'default' => 20,
                'sanitize_callback' => $callbacks['per_page_limited']
            ],
            'page' => [
                'type' => 'integer',
                'default' => 1,
                'sanitize_callback' => $callbacks['positive_integer']
            ],
            'status' => [
                'type' => 'string',
                'default' => 'publish',
                'sanitize_callback' => $callbacks['text'],
                'validate_callback' => function($param) {
                    return in_array($param, ['publish', 'draft', 'private']);
                }
            ],
            'post_id' => [
                'type' => 'integer',
                'required' => true,
                'sanitize_callback' => $callbacks['positive_integer'],
                'validate_callback' => function($param) {
                    return $param > 0;
                }
            ],
            'post_ids' => [
                'type' => 'array',
                'required' => true,
                'sanitize_callback' => function($value) {
                    if (!is_array($value)) {
                        return [];
                    }
                    return array_filter(array_map('absint', $value), function($id) {
                        return $id > 0;
                    });
                },
                'validate_callback' => function($param) {
                    return is_array($param) && !empty($param) && count($param) <= 100;
                }
            ],
            'meta' => [
                'type' => 'array',
                'sanitize_callback' => function($value) use ($callbacks) {
                    $service = new \FanCoolo\Admin\Api\Services\SanitizationService();
                    return $service->sanitizeArray($value, 'text', ['max_elements' => 50]);
                },
                'validate_callback' => function($param) {
                    return is_array($param);
                }
            ],
            'operations' => [
                'type' => 'array',
                'required' => true,
                'sanitize_callback' => function($value) use ($callbacks) {
                    $service = new \FanCoolo\Admin\Api\Services\SanitizationService();
                    return $service->sanitizeArray($value, 'array', ['max_elements' => 50]);
                },
                'validate_callback' => function($param) {
                    return is_array($param) && !empty($param) && count($param) <= 50;
                }
            ]
        ];
    }

    /**
     * Sanitize request parameters using standard rules
     *
     * @param \WP_REST_Request $request The request object
     * @param array $param_rules Parameter-specific rules (key => rule_name)
     * @return array Sanitized parameters
     */
    protected function sanitizeRequestParams(\WP_REST_Request $request, array $param_rules): array
    {
        $standard_rules = $this->getStandardValidationRules();
        $sanitized = [];

        foreach ($param_rules as $param => $rule_name) {
            if (isset($standard_rules[$rule_name])) {
                $rule = $standard_rules[$rule_name];
                $value = $request->get_param($param);

                // Use default if parameter not provided
                if ($value === null && isset($rule['default'])) {
                    $value = $rule['default'];
                }

                // Sanitize the value
                if (isset($rule['sanitize_callback']) && $value !== null) {
                    $sanitized[$param] = call_user_func($rule['sanitize_callback'], $value);
                } else {
                    $sanitized[$param] = $value;
                }
            }
        }

        return $sanitized;
    }

    /**
     * Sanitize nested meta data structure (for bulk operations)
     *
     * @param array $meta_data Meta data to sanitize
     * @param string $post_type Post type for context
     * @return array Sanitized meta data
     */
    protected function sanitizeNestedMeta(array $meta_data, string $post_type = ''): array
    {
        $service = $this->getSanitizationService();
        $sanitized = [];

        foreach ($meta_data as $category => $data) {
            $sanitized_category = $service->sanitizeText($category, 'key');

            if (!is_array($data)) {
                continue;
            }

            $sanitized[$sanitized_category] = [];

            foreach ($data as $key => $value) {
                // List of known safe keys that should preserve their case
                $preserveKeysCase = [
                    'php', 'scss', 'editorScss', 'js', 'settings', 'attributes',
                    'inner_blocks_settings', 'innerBlocksSettings',
                    'selected_partials', 'selectedPartials',
                    'editor_selected_partials', 'editorSelectedPartials',
                    'is_global', 'isGlobal', 'global_order', 'globalOrder'
                ];

                // Preserve case for known keys, sanitize others
                $sanitized_key = in_array($key, $preserveKeysCase, true) ? $key : $service->sanitizeText($key, 'key');

                // Context-specific sanitization
                switch ($key) {
                    case 'php':
                        $sanitized[$sanitized_category][$sanitized_key] = $service->sanitizePhpCode($value);
                        break;
                    case 'scss':
                    case 'editorScss':
                        $sanitized[$sanitized_category][$sanitized_key] = $service->sanitizeScssCode($value);
                        break;
                    case 'js':
                        $sanitized[$sanitized_category][$sanitized_key] = $service->sanitizeJsCode($value);
                        break;
                    case 'settings':
                    case 'inner_blocks_settings':
                    case 'innerBlocksSettings':
                    case 'attributes':
                    case 'selected_partials':
                    case 'selectedPartials':
                    case 'editor_selected_partials':
                    case 'editorSelectedPartials':
                        $sanitized[$sanitized_category][$sanitized_key] = $service->sanitizeJson($value);
                        break;
                    case 'is_global':
                    case 'isGlobal':
                        $sanitized[$sanitized_category][$sanitized_key] = $service->sanitizeBoolean($value) ? '1' : '0';
                        break;
                    case 'global_order':
                    case 'globalOrder':
                        $sanitized[$sanitized_category][$sanitized_key] = (string) $service->sanitizeInteger($value, 0);
                        break;
                    default:
                        $sanitized[$sanitized_category][$sanitized_key] = $service->sanitizeText($value, 'textarea');
                }
            }
        }

        return $sanitized;
    }

    /**
     * Escape data for safe output in different contexts
     *
     * @param mixed $data Data to escape
     * @param string $context Output context (html, attr, url, js)
     * @return mixed Escaped data
     */
    protected function escapeForOutput($data, string $context = 'html')
    {
        $service = $this->getSanitizationService();

        if (is_array($data)) {
            $escaped = [];
            foreach ($data as $key => $value) {
                $escaped[$service->escapeForOutput($key, 'attr')] = $this->escapeForOutput($value, $context);
            }
            return $escaped;
        }

        return $service->escapeForOutput($data, $context);
    }

    /**
     * Validate and sanitize file upload data
     *
     * @param array $file_data File upload data
     * @return array|false Sanitized file data or false if invalid
     */
    protected function sanitizeFileUpload(array $file_data)
    {
        $service = $this->getSanitizationService();

        // Basic file validation
        if (!isset($file_data['name']) || !isset($file_data['type']) || !isset($file_data['size'])) {
            return false;
        }

        // Sanitize filename
        $filename = $service->sanitizeText($file_data['name'], 'title');
        if (empty($filename)) {
            return false;
        }

        // Validate file extension
        $allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'css', 'scss', 'js'];
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, $allowed_extensions)) {
            return false;
        }

        // Validate file size (max 2MB)
        if ($file_data['size'] > 2 * 1024 * 1024) {
            return false;
        }

        return [
            'name' => $filename,
            'type' => $service->sanitizeText($file_data['type'], 'text'),
            'size' => $service->sanitizeInteger($file_data['size'], 0),
            'tmp_name' => $file_data['tmp_name'] ?? '',
            'error' => $service->sanitizeInteger($file_data['error'] ?? 0, 0)
        ];
    }

    /**
     * Create sanitization callback for REST API route arguments
     *
     * @param string $type Sanitization type
     * @param array $options Additional options
     * @return callable Sanitization callback
     */
    protected function createSanitizationCallback(string $type, array $options = []): callable
    {
        $service = $this->getSanitizationService();

        return function($value) use ($service, $type, $options) {
            switch ($type) {
                case 'title':
                    return $service->sanitizeText($value, 'title');
                case 'description':
                    return $service->sanitizeText($value, 'description');
                case 'slug':
                    return $service->sanitizeText($value, 'slug');
                case 'email':
                    return $service->sanitizeText($value, 'email');
                case 'url':
                    return $service->sanitizeText($value, 'url');
                case 'integer':
                    return $service->sanitizeInteger($value, $options['min'] ?? null, $options['max'] ?? null);
                case 'boolean':
                    return $service->sanitizeBoolean($value);
                case 'array':
                    return $service->sanitizeArray($value, $options['element_type'] ?? 'text', $options);
                case 'json':
                    return $service->sanitizeJson($value, $options);
                case 'php_code':
                    return $service->sanitizePhpCode($value, $options);
                case 'scss_code':
                    return $service->sanitizeScssCode($value);
                case 'js_code':
                    return $service->sanitizeJsCode($value);
                default:
                    return $service->sanitizeText($value);
            }
        };
    }
}