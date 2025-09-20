<?php

namespace Fanculo\FilesManager\Generators;

class Index
{
    public static function generate(string $blockDir, string $blockSlug): bool
    {
        $indexJsPath = $blockDir . '/index.js';

        $content = '(function () {
    const { registerBlockType } = wp.blocks;
    const { useBlockProps, InnerBlocks } = wp.blockEditor;
    const { useState, useEffect, useMemo } = wp.element;
    const { Spinner } = wp.components;

    // InnerBlocks options for NativeBlocksParser
    const PARSER_OPTIONS = {
        allowedBlocks: [
            "core/paragraph",
            "core/heading",
            "core/image",
            "core/button",
            "core/group",
            "core/columns",
            "core/column"
        ],
        template: [
            ["core/paragraph", { placeholder: "Add some content here..." }]
        ],
        templateLock: false
    };

    const Edit = function(props) {
        const { attributes } = props;
        const [serverContent, setServerContent] = useState("");
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            const postId = wp.data.select("core/editor").getCurrentPostId() || 0;

            wp.apiFetch({
                path: "/wp/v2/block-renderer/fanculo/BLOCK_SLUG_PLACEHOLDER?context=edit",
                method: "POST",
                data: {
                    attributes: attributes,
                    post_id: postId
                }
            }).then(response => {
                setServerContent(response.rendered);
                setIsLoading(false);
            }).catch(error => {
                console.error("Block render error:", error);
                setServerContent("<div><!-- Block render error --></div>");
                setIsLoading(false);
            });
        }, []);

        const blockProps = useBlockProps();

        // Parse HTML and avoid extra wrapper
        const parseServerContent = (htmlString) => {
            if (!htmlString) return [];

            const container = document.createElement('div');
            container.innerHTML = htmlString.trim();

            const convertDomToReact = (domNode) => {
                if (domNode.nodeType === Node.ELEMENT_NODE) {
                    const tagName = domNode.tagName.toLowerCase();

                    const children = [];
                    domNode.childNodes.forEach((child) => {
                        const element = convertDomToReact(child);
                        if (element !== null) {
                            children.push(element);
                        }
                    });

                    const props = {};
                    for (const attr of domNode.attributes) {
                        if (attr.name === 'class') {
                            props.className = attr.value;
                        } else {
                            props[attr.name] = attr.value;
                        }
                    }

                    return wp.element.createElement(tagName, props, ...children);
                } else if (domNode.nodeType === Node.TEXT_NODE) {
                    return domNode.textContent;
                }
                return null;
            };

            const elements = [];
            container.childNodes.forEach((node) => {
                const element = convertDomToReact(node);
                if (element !== null) {
                    elements.push(element);
                }
            });

            return elements;
        };

        // Memoize the parser call to prevent unnecessary re-renders
        const renderedContent = useMemo(() => {
            if (isLoading) return null;

            // Skip FanculoInnerBlocksParser as it adds extra wrapper div
            // if (window.FanculoInnerBlocksParser && window.FanculoInnerBlocksParser.createServerContentRenderer) {
            //     return window.FanculoInnerBlocksParser.createServerContentRenderer(serverContent, blockProps, PARSER_OPTIONS);
            // }

            // Parse the HTML and apply blockProps to existing element instead of wrapping
            const parsedElements = parseServerContent(serverContent);
            if (parsedElements.length === 1) {
                // If single root element, clone it and merge blockProps
                return wp.element.cloneElement(parsedElements[0], blockProps);
            } else {
                // If multiple elements, wrap in div with blockProps
                return wp.element.createElement('div', blockProps, ...parsedElements);
            }
        }, [serverContent, blockProps, isLoading]);

        if (isLoading) {
            return wp.element.createElement("div", blockProps,
                wp.element.createElement(Spinner)
            );
        }

        return renderedContent;
    };

    registerBlockType("fanculo/BLOCK_SLUG_PLACEHOLDER", {
        edit: Edit,
        save: function() {
            return wp.element.createElement(InnerBlocks.Content);
        }
    });
})()';

        // Replace the placeholder with actual block slug
        $content = str_replace('BLOCK_SLUG_PLACEHOLDER', $blockSlug, $content);

        $result = file_put_contents($indexJsPath, $content);

        return $result !== false;
    }
}