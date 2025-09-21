# Inner Blocks Generation Examples

## ✅ Implementation Complete

The Index.php generator now dynamically creates JavaScript based on Inner Blocks Settings.

---

## 📝 Generated JavaScript Examples

### 🔸 **Example 1: Inner Blocks DISABLED** (Default)

When Inner Blocks toggle is **OFF**, the generated `index.js` will be:

```javascript
(function () {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks } = wp.blockEditor;

    // No inner blocks - empty options
    const PARSER_OPTIONS = {};

    // Wait for FanculoBlockRenderer to be available
    function waitForRenderer(callback) {
        if (window.FanculoBlockRenderer?.createServerRenderComponent) {
            callback();
        } else {
            setTimeout(() => waitForRenderer(callback), 50);
        }
    }

    waitForRenderer(() => {
        // Use the shared FanculoBlockRenderer to create the edit component
        const Edit = window.FanculoBlockRenderer.createServerRenderComponent(
            "fanculo/my-block",
            PARSER_OPTIONS
        );

        registerBlockType("fanculo/my-block", {
            edit: Edit,
            save: function() {
                return null; // Server-side rendering
            }
        });
    });
})()
```

---

### 🔸 **Example 2: Inner Blocks ENABLED with Selected Blocks**

When Inner Blocks toggle is **ON** and user selects blocks like `["core/paragraph", "core/heading", "core/image"]`:

```javascript
(function () {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks } = wp.blockEditor;

    // InnerBlocks options
    const PARSER_OPTIONS = {
        allowedBlocks: ["core/paragraph","core/heading","core/image"],
        template: [
            ["core/paragraph", { placeholder: "Add some content here..." }]
        ],
        templateLock: false
    };

    // Wait for FanculoBlockRenderer to be available
    function waitForRenderer(callback) {
        if (window.FanculoBlockRenderer?.createServerRenderComponent) {
            callback();
        } else {
            setTimeout(() => waitForRenderer(callback), 50);
        }
    }

    waitForRenderer(() => {
        // Use the shared FanculoBlockRenderer to create the edit component
        const Edit = window.FanculoBlockRenderer.createServerRenderComponent(
            "fanculo/my-block",
            PARSER_OPTIONS
        );

        registerBlockType("fanculo/my-block", {
            edit: Edit,
            save: function() {
                return wp.element.createElement(InnerBlocks.Content);
            }
        });
    });
})()
```

---

### 🔸 **Example 3: Inner Blocks ENABLED with No Restrictions**

When Inner Blocks toggle is **ON** but no specific blocks are selected (allow all):

```javascript
(function () {
    const { registerBlockType } = wp.blocks;
    const { InnerBlocks } = wp.blockEditor;

    // InnerBlocks options
    const PARSER_OPTIONS = {
        template: [
            ["core/paragraph", { placeholder: "Add some content here..." }]
        ],
        templateLock: false
    };

    // Wait for FanculoBlockRenderer to be available
    function waitForRenderer(callback) {
        if (window.FanculoBlockRenderer?.createServerRenderComponent) {
            callback();
        } else {
            setTimeout(() => waitForRenderer(callback), 50);
        }
    }

    waitForRenderer(() => {
        // Use the shared FanculoBlockRenderer to create the edit component
        const Edit = window.FanculoBlockRenderer.createServerRenderComponent(
            "fanculo/my-block",
            PARSER_OPTIONS
        );

        registerBlockType("fanculo/my-block", {
            edit: Edit,
            save: function() {
                return wp.element.createElement(InnerBlocks.Content);
            }
        });
    });
})()
```

---

## 🔄 How It Works

### 1. **User Interface**
- User toggles "Enable Inner Blocks" in Block Settings
- If enabled, user can select allowed block types using the tag input
- Settings are saved to WordPress meta as JSON

### 2. **File Generation Process**
- When block files are generated/regenerated
- `Index.php` generator receives the post ID
- Generator fetches inner blocks settings from post meta
- JavaScript is dynamically generated based on settings

### 3. **WordPress Integration**
- Generated `index.js` is loaded by WordPress
- Block behaves according to inner blocks configuration
- If inner blocks enabled: shows InnerBlocks interface in editor
- If disabled: uses standard server-side rendering

---

## 📊 Setting Options

### JSON Structure in WordPress Meta
```json
{
  "enabled": true,
  "allowed_blocks": [
    "core/paragraph",
    "core/heading",
    "core/image",
    "core/button"
  ]
}
```

### JavaScript Generation Logic
- **`enabled: false`** → No allowedBlocks, `save: null`
- **`enabled: true`** + **empty array** → No allowedBlocks restriction, `save: InnerBlocks.Content`
- **`enabled: true`** + **with blocks** → Specific allowedBlocks array, `save: InnerBlocks.Content`

---

## 🎯 Benefits

1. **Dynamic Block Behavior** - Each block can have different inner block settings
2. **No Hardcoded Restrictions** - Completely customizable via UI
3. **Performance Optimized** - Only loads inner blocks code when needed
4. **WordPress Standards** - Uses official InnerBlocks API
5. **User Friendly** - Visual interface for block selection

---

## ✅ Ready for Production!

The inner blocks integration is now complete and will automatically generate the appropriate JavaScript based on user settings in the Fanculo block builder interface.