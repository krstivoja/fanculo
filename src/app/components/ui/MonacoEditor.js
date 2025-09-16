import React from 'react';
import Editor from '@monaco-editor/react';

const MonacoEditor = ({
  value,
  onChange,
  language = 'javascript',
  height = '300px',
  placeholder,
  ...props
}) => {
  const handleEditorChange = (value) => {
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
          placeholder: placeholder || `Enter ${language} code...`
        }}
        {...props}
      />
  );
};

export default MonacoEditor;