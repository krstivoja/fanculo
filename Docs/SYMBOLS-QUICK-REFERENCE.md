# Symbol System Quick Reference

## ⚡ Quick Start

### 1. Create a Symbol

1. Go to **FanCoolo Items** → **Add New**
2. Set **Type** to **Symbol**
3. Name it (e.g., "Button")
4. Add PHP code in **Symbol PHP** field
5. **Publish**

### 2. Use in Blocks

```php
<!-- Instead of this -->
<?php include '../symbols/button.php'; ?>

<!-- Write this -->
<Button />
```

## 📋 Cheat Sheet

### Basic Syntax

```php
<!-- Self-closing -->
<Button />
<Card />
<Hero />

<!-- With attributes -->
<Button type="primary" text="Click me" />
<Card title="Hello" content="World" featured="true" />

<!-- Case insensitive -->
<Button /> <button /> <BUTTON /> <!-- All work the same -->
```

### Symbol PHP Template

```php
<?php
// Get attributes (always available as $symbol_attrs array)
$type = $symbol_attrs['type'] ?? 'default';
$text = $symbol_attrs['text'] ?? 'Button';
$disabled = ($symbol_attrs['disabled'] ?? 'false') === 'true';

// Build classes
$classes = ['btn', 'btn-' . $type];
if ($disabled) $classes[] = 'btn-disabled';
?>

<button class="<?php echo esc_attr(implode(' ', $classes)); ?>">
    <?php echo esc_html($text); ?>
</button>
```

### Common Attribute Patterns

```php
<?php
// String attributes
$title = $symbol_attrs['title'] ?? 'Default Title';

// Boolean attributes
$featured = ($symbol_attrs['featured'] ?? 'false') === 'true';

// Enum validation
$size = in_array($symbol_attrs['size'] ?? 'medium', ['small', 'medium', 'large'])
    ? $symbol_attrs['size'] : 'medium';

// Number attributes
$count = max(0, intval($symbol_attrs['count'] ?? 1));

// JSON attributes
$config = json_decode($symbol_attrs['config'] ?? '{}', true);
?>
```

## 🎯 Common Examples

### Button Symbol

```php
<?php
$type = in_array($symbol_attrs['type'] ?? 'default', ['primary', 'secondary', 'default'])
    ? $symbol_attrs['type'] : 'default';
$text = $symbol_attrs['text'] ?? 'Click me';
$url = esc_url($symbol_attrs['url'] ?? '#');
$target = $symbol_attrs['target'] === '_blank' ? '_blank' : '_self';
?>

<a href="<?php echo $url; ?>"
   target="<?php echo esc_attr($target); ?>"
   class="btn btn-<?php echo esc_attr($type); ?>">
    <?php echo esc_html($text); ?>
</a>
```

### Usage in Block:

```php
<Button type="primary" text="Get Started" url="/signup" />
<Button type="secondary" text="Learn More" url="/about" target="_blank" />
```

### Card Symbol

```php
<?php
$title = $symbol_attrs['title'] ?? '';
$content = $symbol_attrs['content'] ?? '';
$image_id = intval($symbol_attrs['image'] ?? 0);
$featured = ($symbol_attrs['featured'] ?? 'false') === 'true';

$classes = ['card'];
if ($featured) $classes[] = 'card--featured';
?>

<div class="<?php echo esc_attr(implode(' ', $classes)); ?>">
    <?php if ($image_id): ?>
        <div class="card__image">
            <?php echo wp_get_attachment_image($image_id, 'medium'); ?>
        </div>
    <?php endif; ?>

    <div class="card__content">
        <?php if ($title): ?>
            <h3 class="card__title"><?php echo esc_html($title); ?></h3>
        <?php endif; ?>

        <?php if ($content): ?>
            <p class="card__text"><?php echo esc_html($content); ?></p>
        <?php endif; ?>
    </div>
</div>
```

### Usage in Block:

```php
<div class="cards-grid">
    <Card title="Feature 1" content="Amazing feature" image="123" />
    <Card title="Feature 2" content="Another feature" featured="true" />
</div>
```

## 🔧 Debugging

### Check if Symbol Exists

```php
<!-- Add this to debug -->
<?php
// List all available symbols
$symbols_dir = plugin_dir_path(__FILE__) . '../symbols/';
if (is_dir($symbols_dir)) {
    $symbols = glob($symbols_dir . '*.php');
    echo '<!-- Available symbols: ' . implode(', ', array_map('basename', $symbols)) . ' -->';
}
?>
```

### Debug Attributes

```php
<!-- Add this to your symbol to see all passed attributes -->
<?php
echo '<!-- Symbol attributes: ';
var_export($symbol_attrs);
echo ' -->';
?>
```

### Test Symbol Directly

```php
<!-- Test a symbol with manual attributes -->
<?php
$symbol_attrs = [
    'type' => 'primary',
    'text' => 'Test Button',
    'url' => '/test'
];
include '../symbols/button.php';
?>
```

## 📝 Best Practices

### ✅ Do This

```php
<!-- Good: Descriptive attributes -->
<Button type="primary" text="Subscribe Now" size="large" />

<!-- Good: Validate and sanitize -->
<?php
$type = in_array($symbol_attrs['type'] ?? 'default', ['primary', 'secondary'])
    ? $symbol_attrs['type'] : 'default';
$text = sanitize_text_field($symbol_attrs['text'] ?? 'Button');
?>

<!-- Good: Provide fallbacks -->
<?php
$title = $symbol_attrs['title'] ?? 'Default Title';
$show_icon = ($symbol_attrs['show_icon'] ?? 'true') === 'true';
?>
```

### ❌ Avoid This

```php
<!-- Bad: No validation -->
<?php $type = $symbol_attrs['type']; ?>

<!-- Bad: No fallbacks -->
<?php $text = $symbol_attrs['text']; ?>

<!-- Bad: Direct output without escaping -->
<h1><?php echo $symbol_attrs['title']; ?></h1>

<!-- Bad: Complex logic in symbols -->
<?php
// Don't do heavy database queries or API calls in symbols
$posts = get_posts(['numberposts' => 100]);
?>
```

## 🚀 Migration from Manual Includes

### Before (Manual)

```php
<?php include '../symbols/button.php'; ?>
<?php include '../symbols/card.php'; ?>
```

### After (React-like)

```php
<Button />
<Card />
```

### With Parameters - Before

```php
<?php
$button_type = 'primary';
$button_text = 'Click me';
include '../symbols/button.php';
?>
```

### With Parameters - After

```php
<Button type="primary" text="Click me" />
```

## 🎨 Advanced Patterns

### Conditional Symbols

```php
<?php $user_level = 'premium'; ?>

<?php if ($user_level === 'premium'): ?>
    <PremiumButton />
<?php else: ?>
    <StandardButton />
<?php endif; ?>
```

### Dynamic Attributes

```php
<?php
$product_id = get_post_meta(get_the_ID(), 'featured_product', true);
$button_text = get_option('cta_text', 'Shop Now');
?>

<ProductCard id="<?php echo esc_attr($product_id); ?>" cta_text="<?php echo esc_attr($button_text); ?>" />
```

### Symbol with JSON Data

```php
<?php
$menu_items = [
    ['text' => 'Home', 'url' => '/'],
    ['text' => 'About', 'url' => '/about'],
    ['text' => 'Contact', 'url' => '/contact']
];
?>

<NavigationMenu items='<?php echo esc_attr(json_encode($menu_items)); ?>' />
```

That's it! The React-like symbol system makes component reuse simple and intuitive while maintaining full PHP power and WordPress compatibility. 🎉
