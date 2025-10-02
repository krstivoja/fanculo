import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { emmetHTML, emmetCSS } from 'emmet-monaco-es';

// Global Emmet initialization flags
let globalEmmetHtmlInitialized = false;
let globalEmmetCssInitialized = false;

const MonacoEditor = ({
  value,
  onChange,
  language = 'javascript',
  height = '300px',
  placeholder,
  enableEmmet = false,
  enablePhpHtmlSwitching = false,
  ...props
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const isInternalChangeRef = useRef(false);

  // Sync external value changes to editor without remounting
  useEffect(() => {
    if (editorRef.current && !isInternalChangeRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(value || '');
        // Restore cursor position if still valid
        if (position) {
          editorRef.current.setPosition(position);
        }
      }
    }
    isInternalChangeRef.current = false;
  }, [value]);

  // Initialize Emmet when Monaco is ready
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (enableEmmet) {
      // Initialize HTML Emmet for HTML-compatible languages including PHP (only once globally)
      if ((language === 'php' || language === 'html' || language === 'javascript') && !globalEmmetHtmlInitialized) {
        emmetHTML(monaco, ['html', 'php', 'javascript']);
        globalEmmetHtmlInitialized = true;
      }

      // Initialize CSS Emmet for CSS-compatible languages (only once globally)
      if ((language === 'scss' || language === 'css') && !globalEmmetCssInitialized) {
        emmetCSS(monaco, ['scss', 'css']);
        globalEmmetCssInitialized = true;
      }
    }

    // Set up PHP/HTML context switching if enabled
    if (enablePhpHtmlSwitching && language === 'php') {
      setupPhpHtmlSwitching(editor, monaco);
    }

    // Call original onMount if provided
    if (props.onMount) {
      props.onMount(editor, monaco);
    }
  };

  // PHP/HTML context detection (for Emmet context, not language switching)
  const setupPhpHtmlSwitching = (editor, monaco) => {
    const detectContext = () => {
      const model = editor.getModel();
      const position = editor.getPosition();
      const fullText = model.getValue();
      const offset = model.getOffsetAt(position);

      // Find PHP opening and closing tags around cursor
      const beforeCursor = fullText.substring(0, offset);
      const afterCursor = fullText.substring(offset);

      const lastPhpOpen = beforeCursor.lastIndexOf('<?php');
      const lastPhpClose = beforeCursor.lastIndexOf('?>');
      const nextPhpClose = afterCursor.indexOf('?>');

      // Determine if we're inside PHP tags
      const isInPhp = lastPhpOpen > lastPhpClose && (nextPhpClose !== -1 || afterCursor.length === 0);

      // Update context state but keep language as PHP for proper syntax highlighting
      const newContext = isInPhp ? 'php' : 'html';
      if (newContext !== currentLanguage) {
        setCurrentLanguage(newContext);
        // Note: We don't change monaco.editor.setModelLanguage here to preserve PHP highlighting
      }
    };

    // Set up listeners for content and cursor changes
    editor.onDidChangeModelContent(detectContext);
    editor.onDidChangeCursorPosition(detectContext);

    // Initial detection
    detectContext();
  };

  const handleEditorChange = (value) => {
    isInternalChangeRef.current = true;
    if (onChange) {
      onChange({ target: { value } }); // Mimic textarea event structure
    }
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value || ''}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto'
        },
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        bracketPairColorization: { enabled: true },
        folding: true,
        foldingHighlight: true,
        unfoldOnClickAfterEndOfLine: true,
        placeholder: placeholder || `Enter ${language} code...`,
        // Enable better emmet support
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showFunctions: true,
          showConstants: true,
          showOperators: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showReferences: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true
        }
      }}
      {...props}
    />
  );
};

export default MonacoEditor;