<?php
namespace GutenbergBlockStudio\App\Blocks\SaveBlocks\Templates\Components;

class Image {
    public static function generate($attr) {
        if (!isset($attr['id']) || !isset($attr['name'])) {
            // Image component error: Missing id or name for attribute
            return 'null';
        }

        $name = $attr['name'];
        $id = $attr['id'];
        $label = isset($attr['label']) ? $attr['label'] : 'Image';

        $customStyle = <<<EOT
            .gutenberg-block-studio-image-component .editor-post-featured-image__actions {
                opacity: 1;
                width: 100%;
                display: flex;
                gap: calc(8px);
            }

            .gutenberg-block-studio-image-component .editor-post-featured-image__action {
                background: #ffffffbf;
                color: var(--wp-components-color-foreground, #1e1e1e);
                flex-grow: 1;
                justify-content: center;
                box-shadow: none !important;
            }

            .gutenberg-block-studio-image-component .editor-post-featured-image__action:hover {
                color: var(--wp-components-color-accent, var(--wp-admin-theme-color, #3858e9)) !important;
                background: #ffffffbf !important;
            }
        EOT;

        $script = <<<EOT
            (() => {
                const image = attributes['$name'];
                const setImage = (media) => setAttributes({ ['$name']: { id: media.id, url: media.url, alt: media.alt } });
                const removeImage = () => setAttributes({ ['$name']: null });
                return wp.element.createElement(
                    'div',
                    { className: 'editor-post-featured-image gutenberg-block-studio-image-component', key: 'image-component-$id' },
                    wp.element.createElement(
                        'style',
                        { key: 'image-styles-$id' },
                        `$customStyle`
                    ),
                    wp.element.createElement(
                        'label',
                        { key: 'image-label-$id', style: { display: 'block', marginBottom: '8px', textTransform: 'uppercase' } },
                        `$label`
                    ),
                    wp.element.createElement(
                        'div',
                        { key: 'image-container-$id', className: 'editor-post-featured-image__container' },
                        !image
                            ? wp.element.createElement(
                                wp.blockEditor.MediaUpload,
                                {
                                    key: 'media-upload-add-$id',
                                    onSelect: setImage,
                                    allowedTypes: ['image'],
                                    value: image ? image.id : null,
                                    render: ({ open }) => wp.element.createElement(
                                        wp.components.Button,
                                        {
                                            key: 'add-image-button-$id',
                                            variant: 'secondary',
                                            className: 'editor-post-featured-image__toggle is-next-40px-default-size',
                                            onClick: open
                                        },
                                        'Add image'
                                    )
                                }
                            )
                            : wp.element.createElement(
                                wp.element.Fragment,
                                { key: 'image-preview-container-$id' },
                                wp.element.createElement(
                                    wp.blockEditor.MediaUpload,
                                    {
                                        key: 'media-upload-edit-$id',
                                        onSelect: setImage,
                                        allowedTypes: ['image'],
                                        value: image.id,
                                        render: ({ open }) => wp.element.createElement(
                                            wp.components.Button,
                                            {
                                                key: 'edit-image-button-$id',
                                                variant: 'secondary',
                                                className: 'editor-post-featured-image__preview is-next-40px-default-size',
                                                onClick: open,
                                                'aria-label': 'Edit or replace the featured image'
                                            },
                                            wp.element.createElement('img', {
                                                key: 'preview-image-$id',
                                                className: 'editor-post-featured-image__preview-image',
                                                src: image.url,
                                                alt: image.alt || 'The current image has no alternative text.'
                                            })
                                        )
                                    }
                                ),
                                wp.element.createElement(
                                    'div',
                                    { key: 'image-actions-$id', className: 'components-flex components-h-stack editor-post-featured-image__actions' },
                                    wp.element.createElement(
                                        wp.blockEditor.MediaUpload,
                                        {
                                            key: 'media-upload-replace-$id',
                                            onSelect: setImage,
                                            allowedTypes: ['image'],
                                            value: image.id,
                                            render: ({ open }) => wp.element.createElement(
                                                wp.components.Button,
                                                {
                                                    key: 'replace-button-$id',
                                                    variant: 'secondary',
                                                    className: 'editor-post-featured-image__action is-next-40px-default-size',
                                                    onClick: open
                                                },
                                                'Replace'
                                            )
                                        }
                                    ),
                                    wp.element.createElement(
                                        wp.components.Button,
                                        {
                                            key: 'remove-button-$id',
                                            variant: 'secondary',
                                            className: 'editor-post-featured-image__action is-next-40px-default-size',
                                            onClick: removeImage
                                        },
                                        'Remove'
                                    )
                                )
                            ),
                        // DropZone
                        wp.element.createElement(
                            wp.components.DropZone,
                            {
                                key: 'dropzone-$id',
                                onFilesDrop: (files) => {
                                    const file = files[0];
                                    if (file && file.type && file.type.startsWith('image/')) {
                                        const url = URL.createObjectURL(file);
                                        setAttributes({ ['$name']: { url, alt: file.name, id: null } });
                                    }
                                },
                                label: 'Drop files to upload'
                            },
                            wp.element.createElement(
                                'div',
                                { key: 'dropzone-content-$id', className: 'components-drop-zone__content' },
                                wp.element.createElement(
                                    'div',
                                    { key: 'dropzone-inner-$id', className: 'components-drop-zone__content-inner' },
                                    wp.element.createElement('span', { key: 'dropzone-text-$id', className: 'components-drop-zone__content-text' }, 'Drop files to upload')
                                )
                            )
                        )
                    )
                );
            })()
            EOT;

        return $script;
    }
}
?>