import { memo, Suspense, lazy } from 'react'
import LoadingSpinner from './LoadingSpinner'

// Lazy load Monaco Editor to reduce initial bundle size
const Editor = lazy(() => import('@monaco-editor/react'))

interface MonacoEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  language: 'php' | 'scss'
  theme?: 'vs-dark' | 'light'
  height?: string | number
  options?: any
}

const MonacoEditor = memo(({
  value,
  onChange,
  language,
  theme = 'vs-dark',
  height = '400px',
  options = {}
}: MonacoEditorProps) => {
  const defaultOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollbar: {
      useShadows: false,
      vertical: 'visible' as const,
      horizontal: 'visible' as const,
      horizontalScrollbarSize: 17,
      verticalScrollbarSize: 17
    },
    wordWrap: 'on' as const,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: false,
    folding: true,
    renderLineHighlight: 'line' as const,
    selectOnLineNumbers: true,
    matchBrackets: 'always' as const,
    ...options
  }

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Configure language-specific features
    if (language === 'php') {
      configurePHPLanguage(monaco)
    } else if (language === 'scss') {
      configureSCSSLanguage(monaco)
    }

    // Set editor theme
    monaco.editor.setTheme(theme)

    // Focus editor
    editor.focus()
  }

  const configurePHPLanguage = (monaco: any) => {
    // Enhanced PHP language configuration
    monaco.languages.setLanguageConfiguration('php', {
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] }
      ]
    })

    // PHP-specific snippets and autocomplete
    monaco.languages.registerCompletionItemProvider('php', {
      provideCompletionItems: () => {
        const suggestions = [
          {
            label: 'WordPress Block Template',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              '<?php',
              '/**',
              ' * Block Name: ${1:Block Name}',
              ' * Description: ${2:Block description}',
              ' */',
              '',
              '// Get block attributes',
              '$attributes = $attributes ?? [];',
              '',
              '// Block content',
              '?>',
              '<div <?php echo get_block_wrapper_attributes(); ?>>',
              '\t${3:Block content here}',
              '</div>'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'WordPress block template with wrapper attributes'
          },
          {
            label: 'get_block_wrapper_attributes',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'get_block_wrapper_attributes(${1:$extra_attributes})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'WordPress function to get block wrapper attributes'
          },
          {
            label: 'wp_kses_post',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'wp_kses_post(${1:$content})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Sanitize content for allowed HTML tags for post content'
          },
          {
            label: 'esc_attr',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'esc_attr(${1:$text})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Escaping for HTML attributes'
          },
          {
            label: 'esc_html',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'esc_html(${1:$text})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Escaping for HTML blocks'
          }
        ]
        return { suggestions }
      }
    })
  }

  const configureSCSSLanguage = (monaco: any) => {
    // Enhanced SCSS language configuration
    monaco.languages.registerCompletionItemProvider('scss', {
      provideCompletionItems: () => {
        const suggestions = [
          {
            label: 'Block Base Styles',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              '.wp-block-${1:namespace}-${2:block-name} {',
              '\t// Block styles here',
              '\t${3:}',
              '',
              '\t// Responsive design',
              '\t@media (max-width: 768px) {',
              '\t\t// Mobile styles',
              '\t}',
              '',
              '\t@media (min-width: 769px) and (max-width: 1024px) {',
              '\t\t// Tablet styles',
              '\t}',
              '',
              '\t@media (min-width: 1025px) {',
              '\t\t// Desktop styles',
              '\t}',
              '}'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'WordPress block base styles template with responsive breakpoints'
          },
          {
            label: 'Tailwind @apply',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '@apply ${1:utility-classes};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Apply Tailwind utility classes'
          },
          {
            label: 'CSS Custom Property',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '--${1:property-name}: ${2:value};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'CSS custom property (CSS variable)'
          },
          {
            label: 'WordPress Editor Styles',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              '// Editor specific styles',
              '.editor-styles-wrapper & {',
              '\t${1:// Styles only for Gutenberg editor}',
              '}',
              '',
              '// Frontend styles',
              ':not(.editor-styles-wrapper) & {',
              '\t${2:// Styles only for frontend}',
              '}'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'WordPress editor vs frontend specific styles'
          }
        ]
        return { suggestions }
      }
    })
  }


  return (
    <div className="monaco-editor-wrapper border border-gray-300 rounded overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-sm text-gray-600 mt-2">Loading editor...</p>
          </div>
        </div>
      }>
        <Editor
          height={height}
          language={language}
          theme={theme}
          value={value}
          onChange={onChange}
          options={defaultOptions}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center" style={{ height }}>
              <div className="text-center">
                <LoadingSpinner />
                <p className="text-sm text-gray-600 mt-2">Initializing editor...</p>
              </div>
            </div>
          }
        />
      </Suspense>
    </div>
  )
})

MonacoEditor.displayName = 'MonacoEditor'

export default MonacoEditor