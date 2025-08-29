import { memo, Suspense, lazy, useRef, useEffect, useState } from 'react'
import LoadingSpinner from './LoadingSpinner'
import useEmmet from '../../utils/monaco/useEmmet'
import usePHPIntellisense from '../../utils/monaco/usePHPIntellisense'
import useEditorConfig from '../../utils/monaco/useEditorConfig'
import { preloadManager, observeEditor, trackLanguageUsage } from '../../utils/monaco/preloadingStrategy'
import { monacoInstanceManager } from '../../utils/monaco/monacoInstanceManager'
import { aggressivePreloader } from '../../utils/monaco/aggressivePreloader'
import { areMonacoAssetsCached } from '../../utils/monaco/serviceWorkerManager'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const sessionStartRef = useRef<number>(Date.now())
  const [isPreloaded, setIsPreloaded] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Loading editor...')
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

  // Setup aggressive preloading and caching
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let mounted = true

    const initializeEditor = async () => {
      try {
        setLoadingMessage('Checking cache...')
        
        // Check if assets are already cached
        const cached = await areMonacoAssetsCached()
        if (cached) {
          setLoadingMessage('Loading from cache...')
        } else {
          setLoadingMessage('Downloading editor...')
        }

        // Start aggressive preloading
        await aggressivePreloader.startPreloading()
        
        if (mounted) {
          setLoadingMessage('Initializing editor...')
          
          // Get or create cached instance
          const instance = await monacoInstanceManager.getOrCreateInstance(language, container)
          
          if (mounted) {
            setIsPreloaded(true)
            console.debug(`Monaco editor ready for ${language}`)
          }
        }
      } catch (error) {
        console.error('Failed to initialize Monaco editor:', error)
        if (mounted) {
          setLoadingMessage('Loading editor (fallback)...')
          setIsPreloaded(true) // Allow fallback to regular loading
        }
      }
    }

    initializeEditor()

    // Observe editor for intelligent preloading
    observeEditor(container)

    // Start preloading when component mounts
    preloadManager.startPreloading()

    return () => {
      mounted = false
      
      // Release the instance
      monacoInstanceManager.releaseInstance(language)
      
      // Track language usage when component unmounts
      if (language === 'php' || language === 'scss') {
        trackLanguageUsage(language as 'php' | 'scss', sessionStartRef.current)
      }
      
      // Unobserve editor
      preloadManager.unobserveEditor(container)
    }
  }, [])

  // Track language changes
  useEffect(() => {
    sessionStartRef.current = Date.now()
  }, [language])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Store references for hooks
    editorRef.current = editor
    monacoRef.current = monaco

    // Store references in instance manager
    monacoInstanceManager.setInstanceReferences(language, editor, monaco)

    // Set editor theme
    monaco.editor.setTheme(theme)

    // Focus editor
    editor.focus()

    // Track successful editor mount
    if (language === 'php' || language === 'scss') {
      trackLanguageUsage(language as 'php' | 'scss', sessionStartRef.current)
    }

    console.debug(`Monaco editor mounted successfully for ${language}`)
  }

  // Note: Language configurations and autocomplete are now handled by custom hooks above


  return (
    <div ref={containerRef} className="monaco-editor-wrapper border border-gray-300 rounded overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-sm text-gray-600 mt-2">{loadingMessage}</p>
            {!isPreloaded && (
              <div className="text-xs text-gray-500 mt-1">
                Preparing optimized editor...
              </div>
            )}
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
                <p className="text-sm text-gray-600 mt-2">{loadingMessage}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {isPreloaded ? 'Using cached instance...' : 'First-time setup...'}
                </div>
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