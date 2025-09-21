## Fanculo block manipulation improvements

This document lists targeted, copy‑pastable improvements for:

- `assets/js/block-renderer.js`
- `app/FilesManager/Generators/BlockJsonGenerator.php`
- `app/FilesManager/Generators/Index.php`

Apply the snippets below directly in the indicated files.

---

### assets/js/block-renderer.js

#### 1) Use stable, path‑based keys and skip unsafe tags/attrs in DOM→React conversion

Replace the whole `convertDomToReact` function inside `parseServerContent` and update the root loop to pass path strings.

```javascript
// Replace the whole convertDomToReact with this:
const convertDomToReact = (domNode, path = '0') => {
    if (domNode.nodeType === Node.ELEMENT_NODE) {
        const tagName = domNode.tagName.toLowerCase();

        // Skip unsafe elements
        if (tagName === 'script' || tagName === 'noscript') {
            return null;
        }

        // Handle <innerblocks /> tags
        if (tagName === 'innerblocks') {
            return createElement(InnerBlocks, {
                key: `innerblocks-${path}`,
                allowedBlocks: options.allowedBlocks || null,
                template: options.template || [],
                templateLock: options.templateLock || false
            });
        }

        // Handle <div class="fanculo-block-inserter"> elements
        if (tagName === 'div' && domNode.classList && domNode.classList.contains('fanculo-block-inserter')) {
            return createElement(InnerBlocks, {
                key: `innerblocks-inserter-${path}`,
                allowedBlocks: options.allowedBlocks || null,
                template: options.template || [],
                templateLock: options.templateLock || false
            });
        }

        const children = [];
        domNode.childNodes.forEach((child, childIndex) => {
            const childElement = convertDomToReact(child, `${path}.${childIndex}`);
            if (childElement !== null) {
                children.push(childElement);
            }
        });

        const props = { key: path };
        for (const attr of domNode.attributes) {
            // Drop inline event handlers (safety)
            if (/^on/i.test(attr.name)) {
                continue;
            }

            if (attr.name === 'class') {
                props.className = attr.value;
            } else if (attr.name === 'style') {
                // Convert inline style string to object, preserving CSS variables
                const styleObject = {};
                if (attr.value) {
                    attr.value.split(';').forEach(stylePair => {
                        const parts = stylePair.split(':');
                        if (parts.length === 2) {
                            const rawKey = parts[0].trim();
                            const value = parts[1].trim();
                            if (rawKey.startsWith('--')) {
                                // CSS variables keep their original name
                                styleObject[rawKey] = value;
                            } else {
                                const key = rawKey.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                                styleObject[key] = value;
                            }
                        }
                    });
                }
                props.style = styleObject;
            } else {
                const normalizedName = normalizeAttributeName(attr.name);
                const normalizedValue = normalizeAttributeValue(attr.name, attr.value);
                props[normalizedName] = normalizedValue;
            }
        }

        return createElement(tagName, props, ...children);
    } else if (domNode.nodeType === Node.TEXT_NODE) {
        return domNode.textContent;
    }
    return null;
};

// Update the loop to pass path strings:
const elements = [];
container.childNodes.forEach((node, nodeIndex) => {
    const element = convertDomToReact(node, `${nodeIndex}`);
    if (element !== null) {
        elements.push(element);
    }
});
```

#### 2) Broaden boolean attribute normalization

```javascript
// Replace normalizeAttributeValue with:
function normalizeAttributeValue(name, value) {
    const booleanAttributes = [
        'checked', 'selected', 'disabled', 'readonly', 'multiple', 'draggable',
        'autofocus', 'required', 'hidden', 'open', 'contenteditable'
    ];
    if (booleanAttributes.includes(name)) {
        return value === name || value === 'true' || value === '';
    }
    return value;
}
```

#### 3) Abort stale server render requests

Replace the `useEffect` inside `createServerRenderComponent` with:

```javascript
useEffect(() => {
    const controller = new AbortController();
    const postId = wp.data.select("core/editor").getCurrentPostId() || 0;

    setIsLoading(true);
    wp.apiFetch({
        path: `/wp/v2/block-renderer/${blockName}?context=edit`,
        method: "POST",
        data: {
            attributes: attributes,
            post_id: postId
        },
        signal: controller.signal
    }).then(response => {
        setServerContent(response.rendered);
        setIsLoading(false);
    }).catch(error => {
        if (error && error.name === 'AbortError') {
            return;
        }
        console.error(`Block render error for ${blockName}:`, error);
        setServerContent("<div><!-- Block render error --></div>");
        setIsLoading(false);
    });

    return () => controller.abort();
}, [attributesHash]);
```

---

### app/FilesManager/Generators/BlockJsonGenerator.php

#### 1) Conditional asset keys to avoid 404s

Add these checks in `generate()` immediately after building `$blockJson` and before writing the file:

```php
if (!file_exists($outputPath . '/style.css')) {
    unset($blockJson['style']);
}
if (!file_exists($outputPath . '/view.js')) {
    unset($blockJson['viewScript']);
}
// If you decide to include editorStyle in the future:
// if (!file_exists($outputPath . '/index.css')) {
//     unset($blockJson['editorStyle']);
// }
```

#### 2) Recursive merge for settings

In `buildBlockJson()`, replace the settings merge logic with a recursive merge to preserve nested arrays like `supports`:

```php
// When $settings is string:
if (is_string($settings)) {
    $decodedSettings = json_decode($settings, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $blockJson = array_replace_recursive($blockJson, $decodedSettings);
    }
}
// When $settings is array:
elseif (is_array($settings)) {
    $blockJson = array_replace_recursive($blockJson, $settings);
}
```

Optionally, validate `json_last_error()` and log failures for easier debugging.

---

### app/FilesManager/Generators/Index.php

#### 1) Emit complete InnerBlocks options from meta

Extend your parsing of `BLOCK_INNER_BLOCKS_SETTINGS` to include `template` and `templateLock`:

```php
// After decoding $innerBlocksSettings JSON to $settings:
$innerBlocksEnabled = !empty($settings['enabled']);
$allowedBlocks = $settings['allowed_blocks'] ?? [];
$template = $settings['template'] ?? [];
$templateLock = $settings['template_lock'] ?? false;

// Then emit into PARSER_OPTIONS (JS string building):
$parserOptionsJs = "\n    // InnerBlocks options\n    const PARSER_OPTIONS = {" . (
    !empty($allowedBlocks) ? "\n        allowedBlocks: " . json_encode($allowedBlocks, JSON_UNESCAPED_SLASHES) . "," : ""
) .
"\n        template: " . json_encode($template, JSON_UNESCAPED_SLASHES) . ",\n        templateLock: " . ($templateLock ? 'true' : 'false') . "\n    };";
```

If disabled, keep emitting `const PARSER_OPTIONS = {};`.

#### 2) Prefer dependency ordering over polling

Instead of polling `window.FanculoBlockRenderer` with `waitForRenderer`, register the block directly and ensure the PHP enqueue for the block script depends on the renderer script. Replace the content generation to register immediately:

```javascript
(function () {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks } = wp.blockEditor;
    // PARSER_OPTIONS injected above

    try {
        const Edit = window.FanculoBlockRenderer.createServerRenderComponent(
            "fanculo/BLOCK_SLUG_PLACEHOLDER",
            PARSER_OPTIONS
        );

        registerBlockType("fanculo/BLOCK_SLUG_PLACEHOLDER", {
            edit: Edit,
            save: function() {
                return wp.element.createElement(InnerBlocks.Content);
            }
        });
    } catch (error) {
        console.error("Error registering block fanculo/BLOCK_SLUG_PLACEHOLDER:", error);
        registerBlockType("fanculo/BLOCK_SLUG_PLACEHOLDER", {
            edit: function() {
                return wp.element.createElement("div",
                    { className: "fanculo-block-error" },
                    "Block registration error: " + error.message
                );
            },
            save: function() {
                return null;
            }
        });
    }
})();
```

Then, in your PHP enqueue (outside of this file), make the generated `index.js` depend on the renderer script handle so `window.FanculoBlockRenderer` is guaranteed to exist.

---

## Notes

- Merging props (className/style) is already implemented; the changes above focus on stability (keys, aborts) and safety (attrs/tags filtering).
- Consider ignoring `id` attributes from server HTML by default to avoid duplicate IDs in the editor, unless explicitly needed.


