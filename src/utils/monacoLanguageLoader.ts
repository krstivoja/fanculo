// Monaco language loader with dynamic imports for code splitting
import type { languages } from 'monaco-editor'

type SupportedLanguage = 'php' | 'scss'

// Language configurations cache
const languageConfigs = new Map<SupportedLanguage, boolean>()

export const loadLanguage = async (language: SupportedLanguage): Promise<void> => {
  // Check if language is already loaded
  if (languageConfigs.has(language)) {
    return
  }

  try {
    switch (language) {
      case 'php':
        await loadPHPLanguage()
        break
      case 'scss':
        await loadSCSSLanguage()
        break
      default:
        console.warn(`Language ${language} is not supported`)
    }
    
    // Mark language as loaded
    languageConfigs.set(language, true)
  } catch (error) {
    console.error(`Failed to load language ${language}:`, error)
  }
}

const loadPHPLanguage = async (): Promise<void> => {
  // Dynamically import PHP language support
  const [
    { default: php }
  ] = await Promise.all([
    import('monaco-editor/esm/vs/basic-languages/php/php.js')
  ])

  // Register PHP language if not already registered
  const monaco = await import('monaco-editor')
  const existingLanguages = monaco.languages.getLanguages()
  const phpExists = existingLanguages.some(lang => lang.id === 'php')

  if (!phpExists) {
    monaco.languages.register({ id: 'php' })
    monaco.languages.setMonarchTokensProvider('php', php.language)
    monaco.languages.setLanguageConfiguration('php', php.conf)
  }
}

const loadSCSSLanguage = async (): Promise<void> => {
  // Dynamically import SCSS language support
  const [
    { default: scss }
  ] = await Promise.all([
    import('monaco-editor/esm/vs/basic-languages/scss/scss.js')
  ])

  // Register SCSS language if not already registered
  const monaco = await import('monaco-editor')
  const existingLanguages = monaco.languages.getLanguages()
  const scssExists = existingLanguages.some(lang => lang.id === 'scss')

  if (!scssExists) {
    monaco.languages.register({ id: 'scss' })
    monaco.languages.setMonarchTokensProvider('scss', scss.language)
    monaco.languages.setLanguageConfiguration('scss', scss.conf)
  }
}

// Pre-load languages that are commonly used
export const preloadCommonLanguages = async (): Promise<void> => {
  // Pre-load PHP and SCSS as they are the main languages for this plugin
  await Promise.all([
    loadLanguage('php'),
    loadLanguage('scss')
  ])
}


// WordPress-specific code templates
export const getCodeTemplates = (language: SupportedLanguage) => {
  const templates = {
    php: {
      'wp-block': `<?php
/**
 * Block Name: {blockName}
 * Description: {blockDescription}
 */

// Get block attributes
$attributes = $attributes ?? [];

// Block content
?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    <!-- Block content here -->
</div>`,
      'wp-block-with-innerblocks': `<?php
/**
 * Block Name: {blockName} 
 * Description: {blockDescription}
 */

// Get block attributes
$attributes = $attributes ?? [];
$allowed_blocks = $attributes['allowedBlocks'] ?? [];

?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    <?php echo $content; ?>
</div>`,
      'wp-dynamic-block': `<?php
/**
 * Dynamic Block Name: {blockName}
 * Description: {blockDescription}  
 */

// Get block attributes
$attributes = $attributes ?? [];

// Query or fetch dynamic data here
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
    <?php else : ?>
        <p>No posts found.</p>
    <?php endif; ?>
</div>`
    },
    scss: {
      'block-base': `.wp-block-{namespace}-{blockName} {
    // Block base styles
    
    // Responsive breakpoints
    @media (max-width: 768px) {
        // Mobile styles
    }
    
    @media (min-width: 769px) and (max-width: 1024px) {
        // Tablet styles  
    }
    
    @media (min-width: 1025px) {
        // Desktop styles
    }
}`,
      'component-styles': `// Component: {componentName}
.{componentName} {
    // Component styles
    
    // Modifiers
    &--variant {
        // Variant styles
    }
    
    &--size-small {
        // Small size variant
    }
    
    &--size-large {
        // Large size variant
    }
    
    // States
    &:hover {
        // Hover state
    }
    
    &:focus {
        // Focus state  
    }
    
    &.is-active {
        // Active state
    }
}`,
      'utility-mixins': `// Utility Mixins
@mixin button-reset {
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
}

@mixin visually-hidden {
    position: absolute !important;
    clip: rect(1px, 1px, 1px, 1px);
    -webkit-clip-path: inset(50%);
    clip-path: inset(50%);
    width: 1px !important;
    height: 1px !important;
    overflow: hidden;
}

@mixin container($max-width: 1200px) {
    width: 100%;
    max-width: $max-width;
    margin: 0 auto;
    padding: 0 1rem;
}`
    }
  }

  return templates[language] || {}
}