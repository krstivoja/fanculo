# Sass Built-in Modules & Functions

This document provides a comprehensive overview of all Sass built-in modules that you can use with `@use` in your SCSS code.

## Overview

Sass provides several built-in modules that contain useful functions for working with colors, math, strings, lists, maps, and more. These modules are accessed using the `@use` rule.

## Color Functions

```scss
@use "sass:color";

// Color manipulation
$primary: #3498db;

// Adjust lightness, saturation, hue
.light-blue {
  background: color.scale($primary, $lightness: 20%);
}

.dark-blue {
  background: color.scale($primary, $lightness: -20%);
}

// Mix colors
.mixed-color {
  background: color.mix($primary, #e74c3c, 50%);
}

// Adjust specific properties
.adjusted {
  background: color.adjust($primary, $hue: 15deg, $saturation: 10%);
}

// Get color information
.info {
  --red: #{color.red($primary)};
  --green: #{color.green($primary)};
  --blue: #{color.blue($primary)};
  --hue: #{color.hue($primary)};
  --saturation: #{color.saturation($primary)};
  --lightness: #{color.lightness($primary)};
}
```

## Math Functions

```scss
@use "sass:math";

// Basic math operations
.math-examples {
  --rounded: #{math.round(10.4)};      // 10
  --ceiling: #{math.ceil(10.4)};       // 11
  --floor: #{math.floor(10.4)};        // 10
  --absolute: #{math.abs(-10)};        // 10
  --minimum: #{math.min(1px, 4px)};    // 1px
  --maximum: #{math.max(1px, 4px)};    // 4px
  --clamped: #{math.clamp(1px, 2px, 4px)}; // 2px
  
  // Advanced math
  --power: #{math.pow(2, 3)};          // 8
  --square-root: #{math.sqrt(16)};     // 4
  --random: #{math.random()};          // Random number 0-1
  --random-int: #{math.random(10)};    // Random integer 1-10
}

// Constants
.constants {
  --pi: #{math.$pi};
  --e: #{math.$e};
}

// Unit conversion
.units {
  width: math.div(100px, 2);           // 50px
  height: math.percentage(math.div(1, 3)); // 33.33333%
}
```

## String Functions

```scss
@use "sass:string";

// String manipulation
$text: "Hello World";

.string-examples {
  --length: #{string.length($text)};                    // 11
  --uppercase: #{string.to-upper-case($text)};          // "HELLO WORLD"
  --lowercase: #{string.to-lower-case($text)};          // "hello world"
  --slice: #{string.slice($text, 1, 5)};               // "Hello"
  --index: #{string.index($text, "World")};            // 7
  --insert: #{string.insert($text, " Beautiful", 6)};  // "Hello Beautiful World"
}

// Practical example: BEM class generation
@function bem-element($block, $element) {
  @return string.insert($block, "__#{$element}", string.length($block) + 1);
}

@function bem-modifier($block, $modifier) {
  @return string.insert($block, "--#{$modifier}", string.length($block) + 1);
}

.card {
  // Usage: bem-element("card", "title") => "card__title"
  // Usage: bem-modifier("card", "featured") => "card--featured"
}
```

## List Functions

```scss
@use "sass:list";

// Working with lists
$colors: red, green, blue;
$sizes: 10px, 20px, 30px, 40px;

.list-examples {
  --length: #{list.length($colors)};              // 3
  --second-color: #{list.nth($colors, 2)};       // green
  --first-size: #{list.nth($sizes, 1)};          // 10px
  --index-of-blue: #{list.index($colors, blue)}; // 3
}

// List manipulation
$extended-colors: list.append($colors, yellow);   // red, green, blue, yellow
$joined-list: list.join($colors, $sizes);         // red, green, blue, 10px, 20px, 30px, 40px
$zipped: list.zip($colors, $sizes);               // (red 10px), (green 20px), (blue 30px)

// Practical example: Generate utility classes
@each $color in $colors {
  $index: list.index($colors, $color);
  .text-#{$color} {
    color: $color;
    font-size: list.nth($sizes, $index);
  }
}
```

## Map Functions

```scss
@use "sass:map";

// Define maps
$theme-colors: (
  "primary": #3498db,
  "secondary": #2ecc71,
  "danger": #e74c3c,
  "warning": #f39c12
);

$breakpoints: (
  "small": 576px,
  "medium": 768px,
  "large": 992px,
  "xlarge": 1200px
);

// Map operations
.map-examples {
  --has-primary: #{map.has-key($theme-colors, "primary")};  // true
  --primary-color: #{map.get($theme-colors, "primary")};    // #3498db
  --color-count: #{list.length(map.keys($theme-colors))};   // 4
}

// Practical example: Generate color utilities
@each $name, $color in $theme-colors {
  .bg-#{$name} {
    background-color: $color;
  }
  
  .text-#{$name} {
    color: $color;
  }
  
  .border-#{$name} {
    border-color: $color;
  }
}

// Merge maps
$extended-theme: map.merge($theme-colors, (
  "info": #17a2b8,
  "light": #f8f9fa,
  "dark": #343a40
));

// Responsive mixin using maps
@mixin respond-to($breakpoint) {
  @if map.has-key($breakpoints, $breakpoint) {
    @media (min-width: map.get($breakpoints, $breakpoint)) {
      @content;
    }
  }
}
```

## Meta Functions

```scss
@use "sass:meta";

// Type checking and inspection
$value: 1px;
$color-value: #3498db;
$string-value: "hello";

.meta-examples {
  --value-type: #{meta.type-of($value)};           // "number"
  --color-type: #{meta.type-of($color-value)};     // "color"
  --string-type: #{meta.type-of($string-value)};   // "string"
  --unit: #{meta.unit($value)};                    // "px"
  --is-unitless: #{meta.unitless($value)};         // false
  --comparable: #{meta.comparable(1px, 1em)};      // false
}

// Check if variables/functions exist
@if meta.global-variable-exists("theme-colors") {
  .theme-available {
    display: block;
  }
}

@if meta.function-exists("custom-function") {
  .custom-function-available {
    display: block;
  }
}

// Practical example: Dynamic mixin
@mixin smart-property($property, $value) {
  @if meta.type-of($value) == "number" and meta.unitless($value) {
    #{$property}: #{$value}px;
  } @else {
    #{$property}: $value;
  }
}

.element {
  @include smart-property(width, 100);     // width: 100px
  @include smart-property(height, 50px);   // height: 50px
}
```

## Selector Functions

```scss
@use "sass:selector";

// Selector manipulation
.selector-examples {
  // Nest selectors
  // selector.nest(".parent", ".child") => ".parent .child"
  
  // Append to selector
  // selector.append(".button", "::before") => ".button::before"
  
  // Extend selectors
  // selector.extend(".a", ".b", ".c") => extends .a with .c wherever .b appears
  
  // Replace in selector
  // selector.replace(".old-class", ".old-class", ".new-class") => ".new-class"
  
  // Unify selectors
  // selector.unify(".a.b", ".b.c") => ".a.b.c"
}

// Practical example: Dynamic selector generation
@mixin generate-hover-states($base-selector) {
  #{$base-selector} {
    @content;
  }
  
  #{selector.append($base-selector, ":hover")} {
    transform: scale(1.05);
  }
  
  #{selector.append($base-selector, ":focus")} {
    outline: 2px solid blue;
  }
}

@include generate-hover-states(".button") {
  padding: 10px 20px;
  background: blue;
  color: white;
}
```

## Complete Example

Here's a comprehensive example that uses multiple Sass modules:

```scss
@use "sass:color";
@use "sass:math";
@use "sass:string";
@use "sass:list";
@use "sass:map";
@use "sass:meta";

// Configuration
$primary-color: #3498db;
$secondary-color: #2ecc71;
$spacing-units: 4px, 8px, 12px, 16px, 24px, 32px;
$breakpoints: (
  "sm": 576px,
  "md": 768px,
  "lg": 992px,
  "xl": 1200px
);

// Generate color palette
@function generate-palette($base-color, $steps: 5) {
  $palette: ();
  
  @for $i from 1 through $steps {
    $lightness-adjust: math.percentage(math.div($i - 3, 10));
    $color: color.scale($base-color, $lightness: $lightness-adjust);
    $key: "#{$i}00";
    $palette: map.merge($palette, ($key: $color));
  }
  
  @return $palette;
}

$primary-palette: generate-palette($primary-color);
$secondary-palette: generate-palette($secondary-color);

// Generate spacing utilities
@each $space in $spacing-units {
  $index: list.index($spacing-units, $space);
  $name: "#{$index}";
  
  .p-#{$name} { padding: $space; }
  .m-#{$name} { margin: $space; }
  .gap-#{$name} { gap: $space; }
}

// Generate responsive utilities
@each $breakpoint, $min-width in $breakpoints {
  @media (min-width: $min-width) {
    @each $name, $color in $primary-palette {
      .#{$breakpoint}\\:bg-primary-#{$name} {
        background-color: $color;
      }
    }
  }
}

// Smart component system
@mixin component($name, $props: ()) {
  .#{$name} {
    @if map.has-key($props, "color") {
      $color: map.get($props, "color");
      
      @if meta.type-of($color) == "color" {
        background-color: $color;
        color: color.scale($color, $lightness: -70%);
        border: 1px solid color.scale($color, $lightness: -20%);
      }
    }
    
    @if map.has-key($props, "size") {
      $size: map.get($props, "size");
      $base-padding: list.nth($spacing-units, 3); // 12px
      
      @if $size == "small" {
        padding: math.div($base-padding, 2);
        font-size: 0.875rem;
      } @else if $size == "large" {
        padding: math.mul($base-padding, 1.5);
        font-size: 1.125rem;
      } @else {
        padding: $base-padding;
      }
    }
  }
}

// Usage
@include component("button", (
  "color": $primary-color,
  "size": "large"
));

@include component("badge", (
  "color": $secondary-color,
  "size": "small"
));
```

## Tips and Best Practices

1. **Always use `@use` instead of `@import`** for built-in modules
2. **Namespace your functions** to avoid conflicts (e.g., `color.scale()` not `scale()`)
3. **Combine modules** for powerful utility generation
4. **Use meta functions** for type checking in mixins and functions
5. **Cache expensive calculations** using variables when possible
6. **Use maps** for configuration and theme systems

## Resources

- [Official Sass Documentation](https://sass-lang.com/documentation/modules)
- [Sass Built-in Modules Reference](https://sass-lang.com/documentation/modules) 