## Deprecating `innerblocks-parser.js` in favor of `block-renderer.js`

The modern `assets/js/block-renderer.js` fully handles parsing server HTML, replacing InnerBlocks placeholders, and merging `blockProps`. The legacy `assets/js/innerblocks-parser.js` is now redundant and should be deprecated to avoid duplicate parsing paths.

This guide provides copy‑pastable changes to cleanly deprecate the old parser while keeping PHP placeholder replacement intact.

---

### 1) Stop enqueuing the legacy parser

File: `app/Services/InnerBlocksService.php`

Replace the method body to remove the call to `InnerBlocksProcessor::enqueueParserScript()` and only enqueue the modern renderer.

```php
public function enqueueParserScript(): void
{
    // Always enqueue the modern renderer for all blocks
    wp_enqueue_script(
        'fanculo-block-renderer',
        FANCULO_URL . 'assets/js/block-renderer.js',
        ['wp-element', 'wp-block-editor', 'wp-components', 'wp-data'],
        FANCULO_VERSION,
        true
    );

    // Legacy parser is no longer needed
    // InnerBlocksProcessor::enqueueParserScript();
}
```

---

### 2) Keep placeholder replacement; deprecate parser enqueue

File: `app/FilesManager/Services/InnerBlocksProcessor.php`

Keep `processTemplate()` as‑is (it still standardizes any `<InnerBlocks />` variants into `<div class="fanculo-block-inserter"></div>` for editor context and injects real inner content on the frontend).

Option A: make the enqueue method a no‑op to signal deprecation while remaining source‑compatible:

```php
public static function enqueueParserScript(): void
{
    // Deprecated: handled by assets/js/block-renderer.js
}
```

Option B: delete the method and remove any references to it (ensure you also updated `InnerBlocksService` as above).

---

### 3) Mark the JS parser file as deprecated (optional)

If you want to keep the file in the repo for a while, add a banner comment so its status is clear. No functional code changes needed, and it won’t be enqueued anymore.

File: `assets/js/innerblocks-parser.js` (top of file)

```javascript
/**
 * DEPRECATED: Replaced by window.FanculoBlockRenderer in assets/js/block-renderer.js.
 * This file remains only for backward compatibility and is no longer enqueued.
 */
```

Optionally, plan to remove this file entirely in a future major version.

---

### 4) Testing checklist

- Open the block editor for a block that uses `<InnerBlocks />` in its PHP `render.php` template.
- Verify that the editor renders without JS errors and that placeholders are replaced correctly.
- Add/remove inner blocks and confirm the editor and frontend output behave as expected.
- Confirm network tab does not load `assets/js/innerblocks-parser.js`.

---

### 5) Rollback plan

If you need to revert temporarily:

- Re‑enable `InnerBlocksProcessor::enqueueParserScript()` in `InnerBlocksService`.
- Remove the deprecation comment from `innerblocks-parser.js` (optional).

However, prefer to fix any issues in `block-renderer.js` to avoid maintaining two parallel renderers.


