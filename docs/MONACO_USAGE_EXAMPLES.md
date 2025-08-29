# Monaco Editor Usage Examples

## 🚀 Getting Started

The Monaco Editor is automatically initialized when you create or edit blocks, symbols, or SCSS files. Here are practical examples:

## 📝 WordPress Block Development

### 1. Basic Block Template

Type `!wpblock` and press Enter to get:

```php
<?php
/**
 * Block Name: My Custom Block
 * Description: A custom WordPress block
 */

// Get block attributes
$attributes = $attributes ?? [];

// Block content
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    Block content here
</div>
```

### 2. WordPress Functions Autocomplete

Start typing WordPress functions and get intelligent suggestions:

```php
<?php
// Type "get_post_" and see all post-related functions
get_post_meta($post_id, 'meta_key', true);
get_posts(array('numberposts' => 5));

// Type "esc_" and see all sanitization functions
echo esc_html($title);
echo esc_attr($class_name);
echo esc_url($link_url);

// Type "wp_enqueue_" for script/style functions
wp_enqueue_script('my-script', $script_url, array('jquery'), '1.0.0', true);
wp_enqueue_style('my-style', $style_url, array(), '1.0.0');
?>
```

### 3. WordPress Hooks with Parameter Hints

Type `add_action('` and get hook suggestions with parameters:

```php
<?php
// WordPress Actions - Type "add_action('" to see all hooks
add_action('init', 'my_init_function');
add_action('wp_enqueue_scripts', 'my_enqueue_scripts');
add_action('enqueue_block_editor_assets', 'my_block_assets');

// WordPress Filters - Type "add_filter('" to see all filters
add_filter('the_content', 'my_content_filter');
add_filter('render_block', 'my_block_filter', 10, 2);
add_filter('block_categories_all', 'my_custom_block_categories');
?>
```

## 🎨 SCSS Development

### 1. WordPress Block Styles

Use SCSS autocomplete for block styling:

```scss
// Type ".wp-block-" and get block structure template
.wp-block-my-namespace-my-block {
    // Block styles here
    display: flex;
    gap: 1rem;
    
    // Responsive design
    @media (max-width: 768px) {
        // Mobile styles
        flex-direction: column;
    }
    
    @media (min-width: 769px) and (max-width: 1024px) {
        // Tablet styles
        gap: 0.5rem;
    }
    
    @media (min-width: 1025px) {
        // Desktop styles
        gap: 2rem;
    }
}
```

### 2. SCSS Features

```scss
// Type "@" and get SCSS-specific completions
@import 'variables';

@mixin button-style($bg-color: #0073aa) {
    background: $bg-color;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 3px;
}

.my-button {
    @include button-style(#e74c3c);
    
    &:hover {
        opacity: 0.8;
    }
}

// CSS Custom Properties
:root {
    --primary-color: #0073aa;
    --text-color: #333;
}

.component {
    color: var(--text-color);
    background: var(--primary-color);
}
```

## 🔧 HTML with Emmet

### 1. Basic Emmet Expansion

Type these abbreviations and press **Tab**:

```html
<!-- Type: div.container>header+main+footer -->
<div class="container">
    <header></header>
    <main></main>
    <footer></footer>
</div>

<!-- Type: ul.nav>li.nav-item*4>a.nav-link -->
<ul class="nav">
    <li class="nav-item"><a class="nav-link"></a></li>
    <li class="nav-item"><a class="nav-link"></a></li>
    <li class="nav-item"><a class="nav-link"></a></li>
    <li class="nav-item"><a class="nav-link"></a></li>
</ul>

<!-- Type: form>input[type="text" name="username"]+input[type="password" name="password"]+button{Submit} -->
<form>
    <input type="text" name="username">
    <input type="password" name="password">
    <button>Submit</button>
</form>
```

### 2. WordPress-Specific HTML

```html
<!-- WordPress block wrapper -->
<div <?php echo get_block_wrapper_attributes(); ?>>
    <!-- Type: div.block-content>h2+p*2 + Tab -->
    <div class="block-content">
        <h2></h2>
        <p></p>
        <p></p>
    </div>
</div>
```

## 🔄 Mixed PHP and HTML

Perfect for WordPress block development:

```php
<?php
// PHP functions with autocomplete
$posts = get_posts(array(
    'numberposts' => 5,
    'post_type' => 'post',
    'post_status' => 'publish'
));
?>

<!-- HTML with Emmet expansion -->
<div <?php echo get_block_wrapper_attributes(); ?>>
    <?php if (!empty($posts)) : ?>
        <!-- Type: div.posts-grid>article.post-item*3 + Tab -->
        <div class="posts-grid">
            <?php foreach ($posts as $post) : ?>
                <article class="post-item">
                    <h3><?php echo esc_html(get_the_title($post)); ?></h3>
                    <div class="post-content">
                        <?php echo wp_kses_post(get_the_excerpt($post)); ?>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
```

## ⚡ Advanced Features

### 1. Context-Aware Suggestions

The editor intelligently provides relevant suggestions:

```php
<?php
// Inside PHP tags - Get WordPress functions
$meta_value = get_post_meta($post_id, 'custom_field', true);

// Auto-closing tags work seamlessly
if (!empty($meta_value)) {
    // Type <div> and get automatic closing tag
}
?>

<!-- Outside PHP tags - Get HTML/Emmet suggestions -->
<!-- Type: section.hero>div.container>h1+p+button.cta -->
```

### 2. Snippet Shortcuts

Use `!` prefix for quick templates:

```php
// Type: !wpblock
<?php
/**
 * Block Name: Block Name
 * Description: Block description
 */

$attributes = $attributes ?? [];
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    Block content here
</div>

// Type: !wpdynamic  
<?php
/**
 * Dynamic Block: Block Name
 */

$attributes = $attributes ?? [];
$posts = get_posts([
    'numberposts' => $attributes['numberOfPosts'] ?? 3,
    'post_status' => 'publish'
]);
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    <?php if (!empty($posts)) : ?>
        <?php foreach ($posts as $post) : ?>
            <div class="post-item">
                <h3><?php echo esc_html($post->post_title); ?></h3>
                <div><?php echo wp_kses_post($post->post_excerpt); ?></div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>
```

## 🎯 Pro Tips

### Performance
- Functions are cached for fast autocomplete
- Editor learns your usage patterns
- Background preloading doesn't block UI

### Workflow
1. **Start typing** - Get instant suggestions
2. **Use Tab** - Expand Emmet abbreviations  
3. **Use !shortcuts** - Quick template insertion
4. **Leverage context** - Different suggestions in PHP vs HTML
5. **Explore categories** - WordPress functions grouped by purpose

### Keyboard Shortcuts
- **Tab** - Expand Emmet or accept suggestion
- **Ctrl+Space** - Force show completions
- **Esc** - Close completion menu
- **Arrow keys** - Navigate suggestions

## 📚 Function Categories

- **Blocks**: `register_block_type`, `get_block_wrapper_attributes`
- **Scripts**: `wp_enqueue_script`, `wp_add_inline_script`
- **Styles**: `wp_enqueue_style`, `wp_add_inline_style`
- **Hooks**: `add_action`, `add_filter`, `do_action`
- **Sanitization**: `esc_html`, `esc_attr`, `wp_kses_post`
- **Post Meta**: `get_post_meta`, `update_post_meta`
- **Options**: `get_option`, `update_option`
- **Template**: `the_title`, `the_content`, `get_template_part`

Each category provides contextual suggestions when you start typing relevant functions!