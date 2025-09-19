<?php

namespace Fanculo\MetaBoxes;

abstract class AbstractMetaBox
{
    protected $metaBoxId;
    protected $title;
    protected $context = 'normal';
    protected $priority = 'default';

    public function __construct()
    {
        add_action('add_meta_boxes', [$this, 'addMetaBox']);
        add_action('save_post', [$this, 'savePost']);
    }

    public function addMetaBox()
    {
        add_meta_box(
            $this->metaBoxId,
            $this->title,
            [$this, 'renderMetaBox'],
            'funculo',
            $this->context,
            $this->priority
        );
    }

    abstract public function renderMetaBox($post);

    public function savePost($postId)
    {
        if (!$this->canSave($postId)) {
            return;
        }

        $this->saveFields($postId);
    }

    protected function canSave($postId)
    {
        $nonceAction = $this->getNonceAction();
        $nonceName = $this->getNonceName();

        if (!isset($_POST[$nonceName]) ||
            !wp_verify_nonce(wp_unslash($_POST[$nonceName]), $nonceAction)) {
            return false;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return false;
        }

        if (!current_user_can('edit_post', $postId)) {
            return false;
        }

        return true;
    }

    protected function renderNonce()
    {
        wp_nonce_field($this->getNonceAction(), $this->getNonceName());
    }

    protected function getNonceAction()
    {
        return 'funculo_' . $this->metaBoxId . '_nonce';
    }

    protected function getNonceName()
    {
        return $this->metaBoxId . '_nonce';
    }

    protected function getMetaValue($postId, $key, $default = '')
    {
        $value = get_post_meta($postId, $key, true);
        return $value ? $value : $default;
    }

    protected function saveMetaValue($postId, $key, $value)
    {
        update_post_meta($postId, $key, $value);
    }

    protected function validatePhpCode($code)
    {
        if (empty($code)) {
            return true;
        }

        if (!current_user_can('unfiltered_html')) {
            return false;
        }

        // Basic validation without using eval()
        // Check for dangerous functions and patterns
        $dangerous_functions = [
            'exec', 'shell_exec', 'system', 'passthru', 'eval', 'assert',
            'file_get_contents', 'file_put_contents', 'fopen', 'fwrite',
            'curl_exec', 'curl_init', 'fsockopen', 'pfsockopen'
        ];

        foreach ($dangerous_functions as $func) {
            if (strpos($code, $func) !== false) {
                return false;
            }
        }

        // Use token_get_all to check for basic PHP syntax validity
        $tokens = @token_get_all('<?php ' . $code);
        if (empty($tokens)) {
            return false;
        }

        // Check for balanced braces, brackets, and parentheses
        $balance = ['{}' => 0, '[]' => 0, '()' => 0];
        foreach ($tokens as $token) {
            if (is_string($token)) {
                switch ($token) {
                    case '{': $balance['{}']++; break;
                    case '}': $balance['{}']--; break;
                    case '[': $balance['[]']++; break;
                    case ']': $balance['[]']--; break;
                    case '(': $balance['()']++; break;
                    case ')': $balance['()']--; break;
                }
            }
        }

        return $balance['{}'] === 0 && $balance['[]'] === 0 && $balance['()'] === 0;
    }

    protected function sanitizePhpCode($code)
    {
        if (!$this->validatePhpCode($code)) {
            return '';
        }

        return wp_unslash($code);
    }

    protected function renderCodeField($name, $label, $value, $language = 'php')
    {
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($name); ?>">
                    <?php echo esc_html($label); ?>
                </label>
            </th>
            <td>
                <textarea
                    id="<?php echo esc_attr($name); ?>"
                    name="<?php echo esc_attr($name); ?>"
                    class="funculo-code-editor"
                    rows="15"
                    cols="100"
                    style="width: 100%; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; font-size: 13px;"
                    placeholder="Enter <?php echo esc_attr($language); ?> code..."
                ><?php echo esc_textarea($value); ?></textarea>
            </td>
        </tr>
        <?php
    }

    protected function renderJsonField($name, $label, $value, $placeholder = '{}')
    {
        if (is_array($value) || is_object($value)) {
            $value = json_encode($value, JSON_PRETTY_PRINT);
        }
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($name); ?>">
                    <?php echo esc_html($label); ?>
                </label>
            </th>
            <td>
                <textarea
                    id="<?php echo esc_attr($name); ?>"
                    name="<?php echo esc_attr($name); ?>"
                    class="funculo-json-editor"
                    rows="8"
                    cols="100"
                    style="width: 100%; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; font-size: 13px;"
                    placeholder="<?php echo esc_attr($placeholder); ?>"
                ><?php echo esc_textarea($value); ?></textarea>
            </td>
        </tr>
        <?php
    }

    abstract protected function saveFields($postId);
}