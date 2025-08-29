# Monaco Editor Enhanced Features

This document describes the enhanced Monaco Editor features available in the Fanculo plugin for WordPress block development.

## 🚀 Overview

The Monaco Editor has been enhanced with powerful IDE-like features specifically tailored for WordPress development, including:

- **Emmet Support** - HTML/CSS/SCSS abbreviation expansion
- **WordPress Autocomplete** - PHP functions and WordPress APIs
- **Smart Language Configurations** - Enhanced PHP, HTML, SCSS support
- **Auto-closing Tags** - Intelligent HTML tag completion
- **Code Snippets** - Pre-built templates for common patterns

---

## 📝 Emmet Support

### HTML Emmet Expansion

Type abbreviations and press **Tab** to expand:

```html
<!-- Type: div.container>h1+p*3 + Tab -->
<div class="container">
    <h1></h1>
    <p></p>
    <p></p>
    <p></p>
</div>

<!-- Type: ul>li*5>a[href="#"] + Tab -->
<ul>
    <li><a href="#"></a></li>
    <li><a href="#"></a></li>
    <li><a href="#"></a></li>
    <li><a href="#"></a></li>
    <li><a href="#"></a></li>
</ul>

<!-- Type: nav>ul>li.nav-item*4>a.nav-link + Tab -->
<nav>
    <ul>
        <li class="nav-item"><a class="nav-link"></a></li>
        <li class="nav-item"><a class="nav-link"></a></li>
        <li class="nav-item"><a class="nav-link"></a></li>
        <li class="nav-item"><a class="nav-link"></a></li>
    </ul>
</nav>
```

### CSS/SCSS Emmet Expansion

```scss
/* Type: m10 + Tab */
margin: 10px;

/* Type: p20 + Tab */
padding: 20px;

/* Type: w100p + Tab */
width: 100%;

/* Type: df + Tab */
display: flex;

/* Type: fz14 + Tab */
font-size: 14px;

/* Type: bgc + Tab */
background-color: ;
```

### HTML Attribute Completion

When typing inside HTML tags, get intelligent attribute suggestions:

```html
<!-- Type: <img + Space to get suggestions -->
<img src="" alt="" width="" height="" loading="">

<!-- Type: <a + Space to get suggestions -->
<a href="" target="" rel="">

<!-- Type: <input + Space to get suggestions -->
<input type="" name="" value="" placeholder="" required>
```

---

## 🔧 PHP & WordPress Autocomplete

### WordPress Core Functions

Type any of these functions and get autocomplete with parameter hints:

#### Sanitization & Escaping
```php
esc_html($text)           // Escape HTML output
esc_attr($text)           // Escape HTML attributes  
esc_url($url)             // Escape URLs
wp_kses_post($content)    // Sanitize post content
```

#### Post & Meta Functions
```php
get_post_meta($post_id, 'meta_key', true)
update_post_meta($post_id, 'meta_key', $meta_value)
the_title()
the_content()
get_template_part('slug', 'name')
```

#### WordPress Hooks
```php
add_action('hook_name', 'callback')
add_filter('hook_name', 'callback')
```

#### Options API
```php
get_option('option', $default)
update_option('option', $value)
```

#### Script & Style Enqueuing
```php
wp_enqueue_script('handle', $src, $deps, $ver)
wp_enqueue_style('handle', $src, $deps, $ver)
```

#### Block Functions
```php
get_block_wrapper_attributes($extra_attributes)
register_block_type($block_json_file)
render_block($parsed_block)
```

### PHP Language Constructs

```php
// Basic PHP structures with snippet completion
function name($params) {
    // code
}

foreach ($array as $value) {
    // code
}

if (condition) {
    // code
}

class ClassName {
    // code
}
```

---

## 📋 Code Snippets

### WordPress Block Snippets

Type `!` followed by snippet name for instant templates:

#### `!wpblock` - WordPress Block Template
```php
<?php
/**
 * Block Name: Block Name
 * Description: Block description
 */

// Get block attributes
$attributes = $attributes ?? [];

// Block content
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    Block content here
</div>
```

#### `!wpdynamic` - Dynamic Block Template
```php
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

---

## 🎨 SCSS Enhanced Features

### SCSS-Specific Autocomplete

```scss
// Type @import and get completion
@import 'file';

// Type @mixin and get template
@mixin name($params) {
    // styles
}

// Type @include and get completion
@include mixin-name($args);

// Type @extend and get completion  
@extend .class;

// Type @media and get responsive template
@media (max-width: 768px) {
    // mobile styles
}
```

### WordPress Block Styling Patterns

```scss
// WordPress block base structure
.wp-block-namespace-block-name {
    // Block styles here
    
    // Responsive design
    @media (max-width: 768px) {
        // Mobile styles
    }
    
    @media (min-width: 769px) and (max-width: 1024px) {
        // Tablet styles  
    }
    
    @media (min-width: 1025px) {
        // Desktop styles
    }
}

// Editor vs Frontend specific styles
.editor-styles-wrapper & {
    // Styles only for Gutenberg editor
}

:not(.editor-styles-wrapper) & {
    // Styles only for frontend
}
```

### Tailwind CSS Integration

```scss
// Use @apply for Tailwind utility classes
.my-component {
    @apply flex items-center justify-between p-4 bg-white rounded-lg shadow-md;
}
```

### CSS Custom Properties

```scss
// CSS variables/custom properties
:root {
    --primary-color: #0073aa;
    --text-color: #333;
    --spacing-unit: 1rem;
}

.component {
    color: var(--text-color);
    background: var(--primary-color);
    padding: var(--spacing-unit);
}
```

---

## 🏷️ Auto-closing Tags

### Smart HTML Tag Completion

When you type `>` after an HTML tag, it automatically adds the closing tag:

```html
<!-- Type: <div> -->
<div></div>  <!-- Cursor positioned between tags -->

<!-- Type: <section class="content"> -->
<section class="content"></section>

<!-- Self-closing tags are ignored -->
<img src="image.jpg" alt="description" />  <!-- No closing tag added -->
<br />  <!-- No closing tag added -->
```

### Supported Self-closing Tags
The editor recognizes these self-closing tags and won't add closing tags:
- `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`
- `link`, `meta`, `param`, `source`, `track`, `wbr`

---

## ⚙️ Enhanced Language Configurations

### PHP Language Features

- **Smart PHP tag completion** - Type `<` and get `<?php`, `<?=` suggestions
- **Proper comment handling** - Support for `//` and `/* */` comments  
- **Auto-closing pairs** - Brackets, quotes, and PHP tags
- **Word boundaries** - Proper variable and function recognition
- **Code folding** - Collapse functions, classes, and code blocks

### HTML Language Features

- **Intelligent indentation** - Auto-indent nested tags
- **Tag-aware formatting** - Proper spacing and line breaks
- **Attribute completion** - Context-aware attribute suggestions
- **Comment folding** - Collapse HTML comment blocks

### SCSS Language Features

- **SCSS syntax support** - Variables, mixins, nesting, imports
- **Comment handling** - Both `//` and `/* */` style comments
- **Property completion** - CSS property suggestions
- **Responsive helpers** - Media query templates
- **Code organization** - Folding for rule sets and mixins

---

## 🎯 Context-Aware Features

### PHP Context Detection

The editor intelligently detects when you're inside PHP tags vs HTML:

```php
<?php
// Inside PHP: Get PHP function autocomplete
echo esc_html($title);
?>

<!-- Outside PHP: Get HTML/Emmet expansion -->
<div class="container">
    <!-- HTML context -->
</div>

<?php
// Back in PHP context
$posts = get_posts(['numberposts' => 5]);
?>
```

### Language-Specific Triggers

- **PHP**: `$`, `>`, `:`, `!`, `.` trigger autocomplete
- **HTML**: `<`, `>`, `space` trigger tag/attribute completion  
- **SCSS**: `@`, `.`, `#`, `:` trigger property/selector completion
- **Emmet**: `Tab` key expands abbreviations

---

## 🚀 Performance Optimizations

### Lazy Loading
- Monaco Editor loads only when needed
- Language features initialize on-demand
- Reduced initial bundle size

### Code Splitting  
- Emmet support loaded separately
- Language configurations cached
- Minimal memory footprint

### Smart Suggestions
- Context-aware completions reduce noise
- Prioritized suggestions (snippets > functions > properties)
- Debounced updates for smooth typing

---

## 💡 Tips & Best Practices

### Using Emmet Effectively

1. **Start simple**: `div.container` → `<div class="container"></div>`
2. **Use multiplication**: `li*5` creates 5 list items
3. **Combine operators**: `nav>ul>li.item*3>a[href="#"]`
4. **CSS shortcuts**: `m10` for `margin: 10px`

### WordPress Development Workflow

1. **Use snippets**: Type `!wpblock` for quick block templates
2. **Leverage autocomplete**: Let the editor suggest WordPress functions
3. **Context switching**: Work seamlessly between PHP and HTML
4. **Responsive design**: Use SCSS media query templates

### Code Organization

1. **Consistent naming**: Follow WordPress coding standards
2. **Comment your code**: Use proper PHP/HTML comment syntax  
3. **Modular SCSS**: Use mixins and variables for reusability
4. **Semantic HTML**: Use appropriate HTML5 elements

---

## 🔧 Technical Implementation

### Custom Hooks Architecture

The enhanced features are implemented through three custom React hooks:

- `useEmmet` - Handles Emmet expansion and HTML completion
- `usePHPIntellisense` - Provides WordPress/PHP autocomplete  
- `useEditorConfig` - Configures language settings and auto-closing

### Integration

```tsx
// Monaco Editor component automatically uses these hooks
import useEmmet from '../../utils/monaco/useEmmet'
import usePHPIntellisense from '../../utils/monaco/usePHPIntellisense'  
import useEditorConfig from '../../utils/monaco/useEditorConfig'

// Hooks are called when editor mounts
useEmmet(editorRef.current, monacoRef.current)
usePHPIntellisense(editorRef.current, monacoRef.current)
useEditorConfig(editorRef.current, monacoRef.current)
```

### Dependencies

- `emmet-monaco-es` - Emmet expansion library
- `@monaco-editor/react` - React Monaco Editor wrapper
- Monaco Editor built-in language services

---

## 🐛 Troubleshooting

### Emmet Not Working
- Ensure you're in the correct language context (HTML/CSS/SCSS)
- Check that abbreviation syntax is correct
- Try pressing Tab after typing the abbreviation

### Autocomplete Not Showing
- Verify you're inside PHP tags for PHP functions
- Check trigger characters (type `$` for PHP variables)
- Clear browser cache if issues persist

### Performance Issues
- Large files may have slower autocomplete
- Consider breaking large files into smaller components
- Disable features if not needed for specific use cases

---

## 🔮 Future Enhancements

Planned improvements for future versions:

- **Advanced Emmet**: Custom abbreviation definitions
- **WordPress API**: Integration with WP REST API
- **Theme Detection**: Automatic color scheme switching
- **Custom Snippets**: User-defined code templates
- **Advanced Formatting**: Prettier integration for code formatting
- **IntelliSense**: More advanced code analysis and suggestions

---

*This documentation covers Monaco Editor v1.0 enhanced features. For questions or feature requests, please refer to the plugin documentation or contact support.*