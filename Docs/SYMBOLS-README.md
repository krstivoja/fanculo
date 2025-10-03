# React-like Symbol System Guide

## Overview

The FanCoolo plugin includes a powerful symbol system that allows you to create reusable PHP components and use them with React-like syntax in your blocks. Instead of manually writing `<?php include '../symbols/button.php'; ?>`, you can simply write `<Button />` and the system will automatically resolve and include the correct symbol file.

## Table of Contents

- [Creating Symbols](#creating-symbols)
- [Using Symbols in Blocks](#using-symbols-in-blocks)
- [Attribute Passing](#attribute-passing)
- [Symbol Structure](#symbol-structure)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Creating Symbols

### Step 1: Create a New Symbol

1. Navigate to **FanCoolo Items** in your WordPress admin
2. Click **Add New**
3. Set the **Type** to **Symbol**
4. Give your symbol a meaningful name (e.g., "Button", "Card", "Hero Banner")
5. The slug will be auto-generated (e.g., "button", "card", "hero-banner")

### Step 2: Write Symbol PHP Code

In the **Symbol PHP** meta box, write your reusable component code:

```php
<?php
// Symbol: Button
// Usage: <Button type="primary" text="Click me" />

$type = $symbol_attrs['type'] ?? 'default';
$text = $symbol_attrs['text'] ?? 'Button';
$size = $symbol_attrs['size'] ?? 'medium';

$classes = [
    'btn',
    'btn-' . $type,
    'btn-' . $size
];
?>

<button class="<?php echo esc_attr(implode(' ', $classes)); ?>">
    <?php echo esc_html($text); ?>
</button>
```

### Step 3: Publish the Symbol

Once published, the symbol will be generated to `symbols/{slug}.php` and becomes available for use in blocks.

## Using Symbols in Blocks

### Basic Usage

In your block's **PHP** content, use React-like syntax:

```php
<div <?php echo get_block_wrapper_attributes(); ?>>
    <h2>Welcome to our site</h2>
    <Button />
    <Card />
</div>
```

### Self-Closing vs. Paired Tags

Both syntaxes are supported:

```php
<!-- Self-closing (recommended for simple components) -->
<Button />
<Card />

<!-- Paired tags (useful for components with content) -->
<Button></Button>
<Card></Card>
```

### Case Insensitive Matching

Symbol matching is case-insensitive:

```php
<!-- All of these resolve to symbols/button.php -->
<Button />
<button />
<BUTTON />
<BuTtOn />
```

## Attribute Passing

### Passing Attributes

Pass data to symbols using HTML-like attributes:

```php
<Button
    type="primary"
    text="Get Started"
    size="large"
    icon="arrow-right"
/>
```

### Accessing Attributes in Symbols

Inside your symbol PHP code, attributes are available in the `$symbol_attrs` array:

```php
<?php
// Access passed attributes
$type = $symbol_attrs['type'] ?? 'default';
$text = $symbol_attrs['text'] ?? 'Click me';
$size = $symbol_attrs['size'] ?? 'medium';
$icon = $symbol_attrs['icon'] ?? null;

// Build CSS classes
$classes = ['btn', 'btn-' . $type, 'btn-' . $size];
?>

<button class="<?php echo esc_attr(implode(' ', $classes)); ?>">
    <?php if ($icon): ?>
        <i class="icon-<?php echo esc_attr($icon); ?>"></i>
    <?php endif; ?>
    <?php echo esc_html($text); ?>
</button>
```

### Attribute Data Types

Attributes are passed as strings by default. Handle different data types as needed:

```php
<?php
// String attributes
$title = $symbol_attrs['title'] ?? '';

// Boolean-like attributes
$is_featured = ($symbol_attrs['featured'] ?? 'false') === 'true';

// Numeric attributes
$count = intval($symbol_attrs['count'] ?? 0);

// JSON attributes (for complex data)
$config = json_decode($symbol_attrs['config'] ?? '{}', true);
?>
```

## Symbol Structure

### Recommended Symbol Structure

```php
<?php
/**
 * Symbol: ComponentName
 * Description: Brief description of what this component does
 *
 * Attributes:
 * @param string $type     - Component type (default, primary, secondary)
 * @param string $size     - Component size (small, medium, large)
 * @param string $text     - Display text
 * @param bool   $disabled - Whether component is disabled
 */

// Extract and validate attributes
$type = in_array($symbol_attrs['type'] ?? 'default', ['default', 'primary', 'secondary'])
    ? $symbol_attrs['type']
    : 'default';

$size = in_array($symbol_attrs['size'] ?? 'medium', ['small', 'medium', 'large'])
    ? $symbol_attrs['size']
    : 'medium';

$text = sanitize_text_field($symbol_attrs['text'] ?? 'Component');
$disabled = ($symbol_attrs['disabled'] ?? 'false') === 'true';

// Build component
$classes = [
    'component',
    'component--' . $type,
    'component--' . $size
];

if ($disabled) {
    $classes[] = 'component--disabled';
}
?>

<div class="<?php echo esc_attr(implode(' ', $classes)); ?>">
    <!-- Component markup -->
    <?php echo esc_html($text); ?>
</div>
```

### Complex Symbol Example

```php
<?php
/**
 * Symbol: ProductCard
 * Description: Displays a product card with image, title, price, and CTA
 */

$product_id = intval($symbol_attrs['id'] ?? 0);
$show_price = ($symbol_attrs['show_price'] ?? 'true') === 'true';
$cta_text = $symbol_attrs['cta_text'] ?? 'View Product';
$layout = in_array($symbol_attrs['layout'] ?? 'vertical', ['vertical', 'horizontal'])
    ? $symbol_attrs['layout']
    : 'vertical';

// Get product data (assuming WooCommerce)
if ($product_id && function_exists('wc_get_product')) {
    $product = wc_get_product($product_id);

    if ($product) {
        $title = $product->get_name();
        $price = $product->get_price_html();
        $image = wp_get_attachment_image($product->get_image_id(), 'medium');
        $permalink = $product->get_permalink();
    }
}
?>

<?php if (isset($product) && $product): ?>
<div class="product-card product-card--<?php echo esc_attr($layout); ?>">
    <div class="product-card__image">
        <a href="<?php echo esc_url($permalink); ?>">
            <?php echo $image; ?>
        </a>
    </div>

    <div class="product-card__content">
        <h3 class="product-card__title">
            <a href="<?php echo esc_url($permalink); ?>">
                <?php echo esc_html($title); ?>
            </a>
        </h3>

        <?php if ($show_price): ?>
            <div class="product-card__price">
                <?php echo $price; ?>
            </div>
        <?php endif; ?>

        <div class="product-card__actions">
            <a href="<?php echo esc_url($permalink); ?>" class="btn btn-primary">
                <?php echo esc_html($cta_text); ?>
            </a>
        </div>
    </div>
</div>
<?php else: ?>
    <!-- Fallback for missing product -->
    <div class="product-card product-card--error">
        <p>Product not found (ID: <?php echo esc_html($product_id); ?>)</p>
    </div>
<?php endif; ?>
```

## Best Practices

### 1. Symbol Naming

- Use **PascalCase** for symbol names in blocks: `<ProductCard />`
- Keep symbol slugs **lowercase with hyphens**: `product-card`
- Use descriptive names that indicate the symbol's purpose

### 2. Attribute Validation

Always validate and sanitize attributes:

```php
<?php
// Validate enum values
$type = in_array($symbol_attrs['type'] ?? 'default', ['primary', 'secondary', 'default'])
    ? $symbol_attrs['type']
    : 'default';

// Sanitize text
$title = sanitize_text_field($symbol_attrs['title'] ?? '');

// Validate numbers
$count = max(0, intval($symbol_attrs['count'] ?? 1));

// Validate URLs
$link = esc_url($symbol_attrs['link'] ?? '');
?>
```

### 3. Provide Fallbacks

Always provide sensible defaults:

```php
<?php
$text = $symbol_attrs['text'] ?? 'Default Text';
$type = $symbol_attrs['type'] ?? 'default';
$show_icon = ($symbol_attrs['show_icon'] ?? 'true') === 'true';
?>
```

### 4. Documentation

Document your symbols with comments:

```php
<?php
/**
 * Symbol: ButtonGroup
 * Description: Creates a group of related buttons
 *
 * Required Attributes:
 * @param string $buttons - JSON array of button objects
 *
 * Optional Attributes:
 * @param string $alignment - left, center, right (default: left)
 * @param string $spacing   - compact, normal, loose (default: normal)
 *
 * Button Object Structure:
 * {
 *   "text": "Button Text",
 *   "url": "https://example.com",
 *   "type": "primary|secondary|default",
 *   "target": "_blank|_self"
 * }
 *
 * Example Usage:
 * <ButtonGroup
 *     buttons='[{"text":"Learn More","url":"/about","type":"primary"}]'
 *     alignment="center"
 * />
 */
?>
```

### 5. CSS Class Naming

Use consistent CSS class naming conventions:

```php
<?php
$base_class = 'component-name';
$classes = [
    $base_class,
    $base_class . '--' . $type,
    $base_class . '--' . $size
];

if ($is_featured) {
    $classes[] = $base_class . '--featured';
}
?>

<div class="<?php echo esc_attr(implode(' ', $classes)); ?>">
    <!-- Component content -->
</div>
```

## Common Use Cases

### 1. Button Components

```php
<!-- In your block -->
<div <?php echo get_block_wrapper_attributes(); ?>>
    <h2>Choose Your Plan</h2>

    <Button type="primary" text="Get Started" size="large" />
    <Button type="secondary" text="Learn More" />
</div>
```

### 2. Card Layouts

```php
<!-- In your block -->
<div <?php echo get_block_wrapper_attributes(); ?>>
    <div class="cards-grid">
        <Card
            title="Feature One"
            content="Description of feature one"
            icon="check"
        />
        <Card
            title="Feature Two"
            content="Description of feature two"
            icon="star"
        />
        <Card
            title="Feature Three"
            content="Description of feature three"
            icon="heart"
        />
    </div>
</div>
```

### 3. Complex Components

```php
<!-- In your block -->
<div <?php echo get_block_wrapper_attributes(); ?>>
    <HeroSection
        title="Welcome to Our Site"
        subtitle="We create amazing experiences"
        background_image="123"
        cta_text="Get Started Today"
        cta_url="/contact"
        layout="centered"
    />
</div>
```

## Troubleshooting

### Symbol Not Found

If a symbol reference like `<Button />` doesn't work:

1. **Check the symbol exists**: Verify the symbol is published in FanCoolo Items
2. **Check the slug**: Ensure the symbol slug matches your reference (case-insensitive)
3. **Regenerate the block**: Re-save your block to trigger file regeneration
4. **Check file permissions**: Ensure the `symbols/` directory is writable

### Attributes Not Working

If attributes aren't being passed correctly:

1. **Check syntax**: Ensure attributes use proper HTML attribute syntax
2. **Check quotes**: Use double quotes for attribute values: `text="Hello"`
3. **Check symbol code**: Verify the symbol accesses `$symbol_attrs` array
4. **Debug attributes**: Add `<?php var_dump($symbol_attrs); ?>` to debug

### Missing Styles

If symbol styles aren't loading:

1. **Check CSS compilation**: Ensure your theme/plugin CSS includes symbol styles
2. **Check file paths**: Verify CSS files reference the correct symbol classes
3. **Clear cache**: Clear any caching plugins or systems

### Performance Issues

If symbols are causing performance issues:

1. **Avoid complex logic**: Keep symbol PHP lightweight
2. **Cache external data**: Cache API calls or database queries within symbols
3. **Limit nested symbols**: Avoid symbols that include other symbols deeply

## Advanced Features

### Conditional Symbol Loading

```php
<?php
// Only load symbol if condition is met
$show_cta = get_option('site_show_cta', true);
?>

<div <?php echo get_block_wrapper_attributes(); ?>>
    <h2>Our Services</h2>
    <p>We provide excellent services...</p>

    <?php if ($show_cta): ?>
        <CallToAction type="primary" text="Contact Us" />
    <?php endif; ?>
</div>
```

### Dynamic Symbol Selection

```php
<?php
// Choose symbol based on context
$user_type = 'premium'; // Could come from user meta, post meta, etc.
$button_type = $user_type === 'premium' ? 'premium' : 'standard';
?>

<div <?php echo get_block_wrapper_attributes(); ?>>
    <?php if ($user_type === 'premium'): ?>
        <PremiumButton text="Access Premium Features" />
    <?php else: ?>
        <Button text="Upgrade to Premium" type="upgrade" />
    <?php endif; ?>
</div>
```

This React-like symbol system provides a powerful way to create consistent, reusable components while maintaining the flexibility of PHP and WordPress. The familiar syntax makes it easy for developers coming from React/JSX environments to create dynamic, server-rendered components.
