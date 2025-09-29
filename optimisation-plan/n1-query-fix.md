# N+1 Query Fix Implementation Plan

## Critical Issue: BlockSettingsRepository N+1 Problem

### Current Problem
In `PostsApiController::getPosts()` (lines 259-272), we have a classic N+1 query problem:

```php
foreach ($postIds as $postId) {
    $postTerms = $allTerms[$postId] ?? [];
    foreach ($postTerms as $term) {
        if ($term['slug'] === 'blocks') {
            $dbSettings = BlockSettingsRepository::get($postId); // ⚠️ N+1 QUERY!
            if ($dbSettings) {
                $blockSettingsMap[$postId] = $dbSettings;
            }
            break;
        }
    }
}
```

**Impact**: For 20 block posts = 20 separate database queries instead of 1 bulk query.

## Solution Implementation

### Step 1: Add `getBulk()` Method to BlockSettingsRepository

Add this method to `app/Database/BlockSettingsRepository.php`:

```php
/**
 * Get block settings for multiple post IDs in a single query
 * @param array $post_ids Array of post IDs
 * @return array Associative array with post_id as key and settings array as value
 */
public static function getBulk(array $post_ids): array
{
    global $wpdb;

    if (empty($post_ids)) {
        return [];
    }

    $table_name = DatabaseInstaller::getTableName();
    $placeholders = implode(',', array_fill(0, count($post_ids), '%d'));

    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table_name WHERE post_id IN ($placeholders)",
        ...$post_ids
    ), ARRAY_A);

    $result = [];
    foreach ($rows as $row) {
        $result[$row['post_id']] = self::processRow($row);
    }

    return $result;
}

/**
 * Process a single database row (shared logic between get() and getBulk())
 * @param array $row Raw database row
 * @return array Processed row with proper data types
 */
private static function processRow(array $row): array
{
    // Convert allowed_block_types from comma-separated to array
    if (!empty($row['allowed_block_types'])) {
        $row['allowed_block_types'] = explode(',', $row['allowed_block_types']);
    } else {
        $row['allowed_block_types'] = [];
    }

    // Convert template from comma-separated to array
    if (!empty($row['template'])) {
        $row['template'] = explode(',', $row['template']);
    } else {
        $row['template'] = [];
    }

    // Convert selected_partials from JSON to array
    if (!empty($row['selected_partials'])) {
        $row['selected_partials'] = json_decode($row['selected_partials'], true) ?: [];
    } else {
        $row['selected_partials'] = [];
    }

    // Convert editor_selected_partials from JSON to array
    if (!empty($row['editor_selected_partials'])) {
        $row['editor_selected_partials'] = json_decode($row['editor_selected_partials'], true) ?: [];
    } else {
        $row['editor_selected_partials'] = [];
    }

    // Convert boolean fields to actual booleans
    $row['supports_inner_blocks'] = (bool) $row['supports_inner_blocks'];

    return $row;
}
```

### Step 2: Refactor `get()` Method to Use Shared Logic

Update the existing `get()` method to use the shared `processRow()` method:

```php
public static function get(int $post_id): ?array
{
    global $wpdb;

    $table_name = DatabaseInstaller::getTableName();
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE post_id = %d",
        $post_id
    ), ARRAY_A);

    if (!$row) {
        return null;
    }

    return self::processRow($row);
}
```

### Step 3: Update PostsApiController to Use Bulk Operations

Replace lines 256-279 in `PostsApiController::getPosts()` with:

```php
// BULK OPERATION 4: Identify blocks and SCSS partials efficiently
$blockPostIds = [];
$scssPartialIds = [];

foreach ($postIds as $postId) {
    $postTerms = $allTerms[$postId] ?? [];
    foreach ($postTerms as $term) {
        if ($term['slug'] === 'blocks') {
            $blockPostIds[] = $postId;
            break;
        } elseif ($term['slug'] === 'scss-partials') {
            $scssPartialIds[] = $postId;
            break;
        }
    }
}

// BULK OPERATION 5: Load block settings from database in ONE query
$blockSettingsMap = [];
if (!empty($blockPostIds)) {
    $blockSettingsMap = BlockSettingsRepository::getBulk($blockPostIds);
}

// BULK OPERATION 6: Load SCSS partial settings from database
$scssSettingsMap = [];
if (!empty($scssPartialIds)) {
    $scssSettingsMap = ScssPartialsSettingsRepository::getBulk($scssPartialIds);
}
```

## Minor Performance Optimizations

### Optimization 1: Bulk Title Fetching

Replace repeated `get_the_title($post->ID)` calls:

```php
// After WP_Query, extract titles in bulk
$postTitles = wp_list_pluck($query->posts, 'post_title', 'ID');

// In the loop, use pre-fetched titles:
'title' => $postTitles[$post->ID] ?? 'Untitled',
```

### Optimization 2: Bulk Edit Link Generation

Replace repeated `get_edit_post_link($post->ID)` calls:

```php
// Generate edit links in bulk
$editLinks = [];
foreach ($query->posts as $post) {
    $editLinks[$post->ID] = get_edit_post_link($post->ID);
}

// In the loop, use pre-generated links:
'edit_url' => $editLinks[$post->ID] ?? '',
```

## Complete Optimized Loop

Here's how the final optimized loop should look:

```php
// Pre-fetch titles and edit links
$postTitles = wp_list_pluck($query->posts, 'post_title', 'ID');
$editLinks = [];
foreach ($query->posts as $post) {
    $editLinks[$post->ID] = get_edit_post_link($post->ID);
}

// Build response with prefetched data - NO MORE INDIVIDUAL QUERIES
$posts = [];
foreach ($query->posts as $post) {
    $postTerms = $allTerms[$post->ID] ?? [];
    $postMeta = $allMeta[$post->ID] ?? [];
    $formattedMeta = $this->bulkQueryService->formatPostMeta($postMeta, $postTerms);

    // Add block settings if this is a block (from bulk query)
    if (isset($blockSettingsMap[$post->ID])) {
        $dbSettings = $blockSettingsMap[$post->ID];

        // Format settings for frontend compatibility
        $blockSettings = [
            'category' => $dbSettings['category'],
            'description' => $dbSettings['description'],
            'icon' => $dbSettings['icon']
        ];

        // Format inner blocks settings
        $innerBlocksSettings = [
            'enabled' => $dbSettings['supports_inner_blocks'],
            'allowed_blocks' => $dbSettings['allowed_block_types'],
            'template' => $dbSettings['template'],
            'templateLock' => $dbSettings['template_lock']
        ];

        // Add to meta in expected format
        if (!isset($formattedMeta['blocks'])) {
            $formattedMeta['blocks'] = [];
        }
        $formattedMeta['blocks']['settings'] = json_encode($blockSettings);
        $formattedMeta['blocks']['inner_blocks_settings'] = json_encode($innerBlocksSettings);
        $formattedMeta['blocks']['selected_partials'] = json_encode($dbSettings['selected_partials'] ?? []);
        $formattedMeta['blocks']['editor_selected_partials'] = json_encode($dbSettings['editor_selected_partials'] ?? []);
    }

    // Add SCSS partial settings if this is a SCSS partial (from bulk query)
    if (isset($scssSettingsMap[$post->ID])) {
        $scssSettings = $scssSettingsMap[$post->ID];
        if (!isset($formattedMeta['scss_partials'])) {
            $formattedMeta['scss_partials'] = [];
        }
        $formattedMeta['scss_partials']['is_global'] = $scssSettings['is_global'] ? '1' : '0';
        $formattedMeta['scss_partials']['global_order'] = (string) $scssSettings['global_order'];
    }

    $posts[] = [
        'id' => $post->ID,
        'title' => $postTitles[$post->ID] ?? 'Untitled',
        'slug' => $post->post_name,
        'status' => $post->post_status,
        'date' => $post->post_date,
        'modified' => $post->post_modified,
        'excerpt' => wp_trim_words($post->post_content, 20),
        'terms' => $postTerms,
        'edit_url' => $editLinks[$post->ID] ?? '',
        'meta' => $formattedMeta,
    ];
}
```

## Performance Impact

### Before Optimization:
- Base query: 1
- Terms bulk query: 1
- Meta bulk query: 1
- Block settings: **N queries** (where N = number of blocks)
- SCSS settings: 1 bulk query
- Title calls: N function calls
- Edit link calls: N function calls
- **Total: 4 + N queries + 2N function calls**

### After Optimization:
- Base query: 1
- Terms bulk query: 1
- Meta bulk query: 1
- Block settings: **1 bulk query**
- SCSS settings: 1 bulk query
- Titles: 1 bulk operation
- Edit links: N function calls (but outside hot loop)
- **Total: 5 queries + N function calls (constant database queries)**

### Expected Results:
- **Database queries reduced by N queries** (where N = number of blocks)
- **60-80% performance improvement** for block-heavy content lists
- **Scalability**: Performance stays constant regardless of number of blocks
- **Consistency**: All repositories now follow the same bulk query pattern

## Testing the Fix

1. **Before**: Time a request with 20+ block posts
2. **Implement**: Add the changes above
3. **After**: Time the same request
4. **Verify**: Check query count in query monitor/debug bar

Expected improvement: **20+ individual queries → 1 bulk query**

## Additional Benefits

1. **Code Consistency**: All repositories now have bulk methods
2. **Future-Proof**: Pattern established for any new repositories
3. **Debugging**: Easier to debug with fewer queries
4. **Caching**: Single bulk query is more cache-friendly
5. **Memory**: Lower memory usage from fewer query objects

This fix addresses the core scalability bottleneck in your plugin's API!