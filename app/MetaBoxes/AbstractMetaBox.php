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
        if (!isset($_POST['funculo_meta_box_nonce']) ||
            !wp_verify_nonce($_POST['funculo_meta_box_nonce'], 'funculo_meta_box_nonce')) {
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
        wp_nonce_field('funculo_meta_box_nonce', 'funculo_meta_box_nonce');
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