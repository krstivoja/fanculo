/**
 * Generate PHP example code for different attribute types
 * @param {Object} attribute - The attribute configuration
 * @returns {string} - The PHP example code
 */
export const getPhpExample = (attribute) => {
  const { type, name } = attribute;

  if (!name) {
    return '// Enter attribute name to see code example';
  }

  // Convert attribute name to camelCase to match what's stored in block.json
  const camelCaseName = name
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/^([A-Z])/, (m) => m.toLowerCase());
  let example = "";

  switch (type) {
    case "text":
    case "textarea":
      example = `<?php if (!empty($attributes['${camelCaseName}'])): ?>
    <p><?php echo esc_html($attributes['${camelCaseName}']); ?></p>
<?php endif; ?>`;
      break;
    case "number":
    case "range":
      example = `<?php if (isset($attributes['${camelCaseName}']) && $attributes['${camelCaseName}'] !== ''): ?>
    <span><?php echo intval($attributes['${camelCaseName}']); ?></span>
<?php endif; ?>`;
      break;
    case "date":
      example = `<?php if (!empty($attributes['${camelCaseName}'])): ?>
    <time><?php echo esc_html($attributes['${camelCaseName}']); ?></time>
<?php endif; ?>`;
      break;
    case "image":
      example = `<?php if (!empty($attributes['${camelCaseName}']) && !empty($attributes['${camelCaseName}']['id'])) {
    echo wp_get_attachment_image($attributes['${camelCaseName}']['id'], 'full');
} ?>`;
      break;
    case "link":
      example = `<?php if (!empty($attributes['${camelCaseName}']) && !empty($attributes['${camelCaseName}']['url'])) {
    $url = esc_url($attributes['${camelCaseName}']['url']);
    $text = !empty($attributes['${camelCaseName}']['text']) ? esc_html($attributes['${camelCaseName}']['text']) : $url;
    $target = !empty($attributes['${camelCaseName}']['target']) ? esc_attr($attributes['${camelCaseName}']['target']) : '_self';
    echo '<a href="' . $url . '" target="' . $target . '">' . $text . '</a>';
} ?>`;
      break;
    case "color":
      example = `<?php if (!empty($attributes['${camelCaseName}'])): ?>
    <div style="color: <?php echo esc_attr($attributes['${camelCaseName}']); ?>">
        Your content here
    </div>
<?php endif; ?>`;
      break;
    case "select":
    case "radio":
      example = `<?php if (!empty($attributes['${camelCaseName}'])): ?>
    <span><?php echo esc_html($attributes['${camelCaseName}']); ?></span>
<?php endif; ?>`;
      break;
    case "checkbox":
      example = `<?php if (!empty($attributes['${camelCaseName}'])): ?>
    <span>Checked</span>
<?php endif; ?>`;
      break;
    case "toggle":
      example = `<?php if (!empty($attributes['${camelCaseName}'])): ?>
    <span>Enabled</span>
<?php endif; ?>`;
      break;
    default:
      example = `<?php if (!empty($attributes['${camelCaseName}'])): ?>
    <span><?php echo esc_html($attributes['${camelCaseName}']); ?></span>
<?php endif; ?>`;
  }
  return example;
};