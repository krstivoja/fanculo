# Simple Hot Reload System

## Overview

The new simplified hot reload system uses direct browser-to-browser communication instead of complex PHP services, making it faster, more reliable, and easier to maintain.

## How It Works

### 1. **Studio Side (Save Detection)**

- When user saves in Fanculo studio, the `useHotReloadSave` hook triggers
- Calls `window.fanculoSimpleHotReload.onStudioSave(postId, ["all"])`
- Fetches current block data from `/wp-json/funculo/v1/post/{postId}` API
- Sends hot reload signal via BroadcastChannel or localStorage fallback

### 2. **Communication Layer**

- **Primary**: BroadcastChannel API for instant cross-tab communication
- **Fallback**: localStorage events for older browsers
- **Message Format**:
  ```js
  {
    type: "hot-reload",
    source: "studio",
    blockId: 123,
    blockSlug: "my-block",
    blockName: "My Block",
    changes: ["all"],
    content: {
      css: "compiled CSS content",
      editorCss: "editor CSS content",
      php: "PHP render code",
      js: "JavaScript code"
    }
  }
  ```

### 3. **Gutenberg Editor Side (Receive & Apply)**

- Listens for hot reload messages via `hot-reload.js`
- When message received:
  - Immediately injects updated CSS into editor iframe
  - Refreshes matching blocks in Gutenberg via block selection
  - No polling, no complex PHP services, no file generation triggers

### 4. **Frontend Side (Optional)**

- Same listener can handle frontend updates
- Injects CSS immediately for style changes
- Reloads page for structural (PHP) changes

## Architecture Benefits

### Before (Complex System)

- ❌ Multiple PHP services (MinimalHotReloadService, HotReloadService, etc.)
- ❌ REST API polling every 2-10 seconds
- ❌ Complex file generation triggers and coordination
- ❌ Database option storage for temporary hot reload data
- ❌ Multiple communication strategies causing conflicts
- ❌ Hard to debug with many moving parts

### After (Simple System)

- ✅ Single JavaScript file (`hot-reload.js`)
- ✅ Instant BroadcastChannel communication (0ms delay)
- ✅ Direct browser-to-browser data transfer
- ✅ Uses existing API endpoints for data fetching
- ✅ No polling, no temporary storage, no complex coordination
- ✅ Easy to debug and maintain

## Files Changed

1. **New**: `assets/js/hot-reload.js` - Core communication system
2. **Modified**: `src/app/hooks/useHotReload.js` - Studio save integration
3. **Modified**: `app/Services/GutenbergSync.php` - Script loading
4. **Modified**: `app/App.php` - Removed complex services

## Files Removed/Disabled

- `app/Services/MinimalHotReloadService.php` - Complex PHP service
- `app/Admin/Api/MinimalHotReloadApiController.php` - Polling endpoints
- `app/Admin/Api/SimpleHotReloadApiController.php` - Redundant endpoints
- `assets/js/hot-reload-sync.js` - Replaced by simple version

## Testing

1. **Setup**:

   - Open Fanculo studio (admin.php?page=fanculo) and Gutenberg editor in separate tabs
   - Make sure you're logged into WordPress in both tabs
   - Select a block to edit in studio (e.g., "sss" block)

2. **Edit**: Make changes to a block in studio:

   - Try changing CSS styles in the "Style" tab
   - Try changing PHP content in the "Content" tab
   - Try changing editor styles in the "Editor Style" tab

3. **Save**: Press Ctrl+S or Cmd+S in studio (or click save button if available)

4. **Verify**: Changes should appear instantly in Gutenberg editor

   - CSS changes: Styles update immediately
   - PHP changes: Block refreshes with new content
   - No page refresh needed

5. **Debug**: Open browser console to see hot reload logs:
   - Studio: `🚀 Sending hot reload signal`
   - Editor: `📨 Received hot reload message`
   - Editor: `✅ Injected style for block`

## Browser Support

- **Modern browsers**: Uses BroadcastChannel for instant communication
- **Older browsers**: Falls back to localStorage events
- **All browsers**: Works across tabs, windows, and devices (same origin)

## Debugging

Enable console logs to see the communication flow:

```js
// In browser console
window.fanculoSimpleHotReload.debugMode = true;
```

Console logs will show:

- `🚀 Sending hot reload signal` (studio side)
- `📨 Received hot reload message` (editor side)
- `✅ Injected style for block` (style updates)
- `🎯 Found X blocks to refresh` (block refresh)
