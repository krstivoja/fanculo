<?php

namespace Fanculo\MetaBoxes;

use Fanculo\PostTypes\FunculoPostType;

abstract class AbstractMetaBox
{
    protected $metaBoxId;
    protected $title;
    protected $context;
    protected $priority;
    protected $fields;

    public function __construct()
    {
        $this->context = 'normal';
        $this->priority = 'default';
        $this->fields = [];

        add_action('add_meta_boxes', [$this, 'addMetaBox']);
        add_action('save_post', [$this, 'saveMetaBox']);
    }

    public function addMetaBox()
    {
        add_meta_box(
            $this->metaBoxId,
            $this->title,
            [$this, 'renderMetaBox'],
            FunculoPostType::getPostType(),
            $this->context,
            $this->priority
        );
    }

    abstract public function renderMetaBox($post);

    public function saveMetaBox($postId)
    {
        // Verify nonce
        if (!isset($_POST[$this->metaBoxId . '_nonce']) ||
            !wp_verify_nonce($_POST[$this->metaBoxId . '_nonce'], $this->metaBoxId . '_save')) {
            return;
        }

        // Check if user has permission to edit
        if (!current_user_can('edit_post', $postId)) {
            return;
        }

        // Check if not an autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        // Check post type
        if (get_post_type($postId) !== FunculoPostType::getPostType()) {
            return;
        }

        $this->saveFields($postId);
    }

    abstract protected function saveFields($postId);

    protected function renderNonce()
    {
        wp_nonce_field($this->metaBoxId . '_save', $this->metaBoxId . '_nonce');
    }

    protected function renderTextField($fieldName, $label, $value = '', $placeholder = '')
    {
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($fieldName); ?>"><?php echo esc_html($label); ?></label>
            </th>
            <td>
                <input type="text"
                       id="<?php echo esc_attr($fieldName); ?>"
                       name="<?php echo esc_attr($fieldName); ?>"
                       value="<?php echo esc_attr($value); ?>"
                       placeholder="<?php echo esc_attr($placeholder); ?>"
                       class="regular-text" />
            </td>
        </tr>
        <?php
    }

    protected function renderTextareaField($fieldName, $label, $value = '', $placeholder = '', $rows = 10)
    {
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($fieldName); ?>"><?php echo esc_html($label); ?></label>
            </th>
            <td>
                <textarea id="<?php echo esc_attr($fieldName); ?>"
                          name="<?php echo esc_attr($fieldName); ?>"
                          placeholder="<?php echo esc_attr($placeholder); ?>"
                          rows="<?php echo esc_attr($rows); ?>"
                          class="large-text code"><?php echo esc_textarea($value); ?></textarea>
            </td>
        </tr>
        <?php
    }

    protected function renderCodeField($fieldName, $label, $value = '', $language = 'php')
    {
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($fieldName); ?>"><?php echo esc_html($label); ?></label>
            </th>
            <td>
                <textarea id="<?php echo esc_attr($fieldName); ?>"
                          name="<?php echo esc_attr($fieldName); ?>"
                          rows="15"
                          class="large-text code funculo-code-editor"
                          data-language="<?php echo esc_attr($language); ?>"><?php echo esc_textarea($value); ?></textarea>
                <p class="description">
                    <?php printf('Enter %s code here.', strtoupper($language)); ?>
                </p>
            </td>
        </tr>
        <?php
    }

    protected function renderJsonField($fieldName, $label, $value = '', $placeholder = '{}')
    {
        $jsonValue = is_array($value) ? json_encode($value, JSON_PRETTY_PRINT) : $value;
        ?>
        <tr>
            <th scope="row">
                <label for="<?php echo esc_attr($fieldName); ?>"><?php echo esc_html($label); ?></label>
            </th>
            <td>
                <textarea id="<?php echo esc_attr($fieldName); ?>"
                          name="<?php echo esc_attr($fieldName); ?>"
                          placeholder="<?php echo esc_attr($placeholder); ?>"
                          rows="10"
                          class="large-text code funculo-json-editor"><?php echo esc_textarea($jsonValue); ?></textarea>
                <p class="description">
                    Enter valid JSON data.
                </p>
            </td>
        </tr>
        <?php
    }

    protected function getMetaValue($postId, $metaKey, $default = '')
    {
        $value = get_post_meta($postId, $metaKey, true);
        return !empty($value) ? $value : $default;
    }

    protected function saveMetaValue($postId, $metaKey, $value)
    {
        if (empty($value)) {
            delete_post_meta($postId, $metaKey);
        } else {
            update_post_meta($postId, $metaKey, $value);
        }
    }
}