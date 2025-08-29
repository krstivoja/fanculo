import { memo, Suspense, lazy, useRef } from 'react'
import LoadingSpinner from './LoadingSpinner'
import useEmmet from '../../utils/monaco/useEmmet'
import usePHPIntellisense from '../../utils/monaco/usePHPIntellisense'
import useEditorConfig from '../../utils/monaco/useEditorConfig'

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
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
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

  // Use our custom hooks for enhanced functionality
  useEmmet(editorRef.current, monacoRef.current)
  usePHPIntellisense(editorRef.current, monacoRef.current)
  useEditorConfig(editorRef.current, monacoRef.current)

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Store references for hooks
    editorRef.current = editor
    monacoRef.current = monaco

    // Set editor theme
    monaco.editor.setTheme(theme)

    // Focus editor
    editor.focus()
  }

  // Note: Language configurations and autocomplete are now handled by custom hooks above


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