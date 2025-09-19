(function() {
    const { registerBlockType } = wp.blocks;
    const { useBlockProps, InnerBlocks } = wp.blockEditor;
    const { useState, useEffect, useMemo, memo, createElement } = wp.element;
    const { Spinner } = wp.components;

    const innerBlocksConfig = {
        allowedBlocks: [
            "core/paragraph",
            "core/heading",
            "core/image"
        ],
        template: [
            ["core/paragraph", { placeholder: "Add some content here..." }]
        ],
        templateLock: false
    };

    const EditComponent = memo(function() {
        const [renderedContent, setRenderedContent] = useState("");
        const [isLoading, setIsLoading] = useState(true);

        useEffect(function() {
            const postId = wp.data.select("core/editor").getCurrentPostId() || 0;

            wp.apiFetch({
                path: "/wp/v2/block-renderer/nbnpx/native-ssr-inner-clean?context=edit",
                method: "POST",
                data: {
                    attributes: {},
                    post_id: postId
                }
            })
            .then(function(response) {
                setRenderedContent(response.rendered);
                setIsLoading(false);
            })
            .catch(function(error) {
                console.error("Block render error:", error);
                setIsLoading(false);
            });
        }, []);

        const blockProps = useBlockProps();

        const renderedElement = useMemo(function() {
            if (isLoading) {
                return null;
            }

            if (window.NativeBlocksParser && window.NativeBlocksParser.createServerContentRenderer) {
                return window.NativeBlocksParser.createServerContentRenderer(
                    renderedContent,
                    blockProps,
                    innerBlocksConfig
                );
            }

            return createElement("div", Object.assign({}, blockProps, {
                dangerouslySetInnerHTML: { __html: renderedContent }
            }));
        }, [renderedContent, blockProps, isLoading]);

        if (isLoading) {
            return createElement("div", blockProps, createElement(Spinner));
        }

        return renderedElement;
    });

    registerBlockType("nbnpx/native-ssr-inner-clean", {
        edit: EditComponent,
        save: function() {
            return createElement(InnerBlocks.Content);
        }
    });
})();