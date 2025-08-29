import { useEffect } from 'react'
import * as emmet from 'emmet-monaco-es'

/**
 * Hook to add Emmet support to Monaco Editor
 * Enables Emmet abbreviations in HTML, CSS, and inside PHP files
 */
export default function useEmmet(editor: any, monaco: any) {
    useEffect(() => {
        if (!editor || !monaco) return

        const loadEmmet = () => {
            try {
                // Register languages that should have Emmet support
                const languages = ['html', 'css', 'scss', 'php']

                // Define Emmet profiles
                const profiles = {
                    php: {
                        markup: 'html',
                        attributes: {
                            'class': 'className',
                            'id': 'id',
                            'style': 'style'
                        }
                    },
                    html: {
                        markup: 'html',
                        attributes: {
                            'class': 'className',
                            'id': 'id',
                            'style': 'style'
                        }
                    }
                }

                // Enable Emmet for HTML and CSS languages
                if (typeof emmet.emmetHTML === 'function') {
                    emmet.emmetHTML(monaco, languages, profiles)
                }
                
                // Register CSS Emmet for both CSS and SCSS
                if (typeof emmet.emmetCSS === 'function') {
                    emmet.emmetCSS(monaco, ['css', 'scss'])
                }

                // Configure Emmet for each language with optimized providers
                const disposables: any[] = []
                
                languages.forEach(lang => {
                    let triggerChars: string[]
                    if (lang === 'css' || lang === 'scss') {
                        triggerChars = ['.', '#', '+', '*', '@', ':', '(', ')', '[', ']', '{', '}', ' ', '-', '$']
                    } else {
                        triggerChars = ['>', '.', '#', '+', '*', '$', '@', ':', '(', ')', '[', ']', '{', '}', ' ']
                    }
                        
                    const disposable = monaco.languages.registerCompletionItemProvider(lang, {
                        triggerCharacters: triggerChars,
                        provideCompletionItems: (model: any, position: any) => {
                            const lineContent = model.getLineContent(position.lineNumber)
                            const textUntilPosition = lineContent.substr(0, position.column - 1)

                            // Enhanced PHP context detection
                            if (lang === 'php') {
                                const lastPhpOpen = textUntilPosition.lastIndexOf('<?')
                                const lastPhpClose = textUntilPosition.lastIndexOf('?>')
                                const insidePHP = lastPhpOpen > lastPhpClose
                                
                                // Skip Emmet inside PHP tags
                                if (insidePHP) {
                                    return { suggestions: [] }
                                }

                                // Skip Emmet when typing PHP variables or functions
                                if (textUntilPosition.match(/\$\w*$/) || 
                                    textUntilPosition.match(/[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                                    return { suggestions: [] }
                                }

                                // Skip Emmet for common PHP function patterns
                                if (textUntilPosition.match(/(get_|wp_|add_|remove_|update_|delete_|the_|is_|has_)[a-zA-Z0-9_]*$/)) {
                                    return { suggestions: [] }
                                }
                            }

                            // HTML tag completion
                            const tagStartMatch = textUntilPosition.match(/<(\w*)$/)
                            const insideTagMatch = textUntilPosition.match(/<(\w+)\s/)
                            
                            if ((tagStartMatch || insideTagMatch) && lang !== 'css' && lang !== 'scss') {
                                if (insideTagMatch) {
                                    const commonAttributes = [
                                        { label: 'class', insertText: 'class="$1"', documentation: 'CSS class name' },
                                        { label: 'id', insertText: 'id="$1"', documentation: 'Unique identifier' },
                                        { label: 'style', insertText: 'style="$1"', documentation: 'Inline CSS styles' },
                                        { label: 'title', insertText: 'title="$1"', documentation: 'Tooltip text' }
                                    ]

                                    return {
                                        suggestions: commonAttributes.map((attr, index) => ({
                                            label: attr.label,
                                            kind: monaco.languages.CompletionItemKind.Property,
                                            insertText: attr.insertText,
                                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                            documentation: attr.documentation,
                                            sortText: `8${index.toString().padStart(3, '0')}`
                                        }))
                                    }
                                }
                                
                                if (tagStartMatch) {
                                    const partialTag = tagStartMatch[1].toLowerCase()
                                    
                                    const commonTags = [
                                        { label: 'div', insertText: 'div>$1</div>', documentation: 'Generic container element' },
                                        { label: 'p', insertText: 'p>$1</p>', documentation: 'Paragraph element' },
                                        { label: 'span', insertText: 'span>$1</span>', documentation: 'Inline container element' },
                                        { label: 'h1', insertText: 'h1>$1</h1>', documentation: 'Heading level 1' },
                                        { label: 'h2', insertText: 'h2>$1</h2>', documentation: 'Heading level 2' },
                                        { label: 'h3', insertText: 'h3>$1</h3>', documentation: 'Heading level 3' },
                                        { label: 'a', insertText: 'a href="$1">$2</a>', documentation: 'Anchor/link element' },
                                        { label: 'img', insertText: 'img src="$1" alt="$2" />', documentation: 'Image element' },
                                        { label: 'button', insertText: 'button>$1</button>', documentation: 'Button element' }
                                    ]

                                    const filteredTags = commonTags.filter(tag => 
                                        partialTag === '' || tag.label.toLowerCase().startsWith(partialTag)
                                    )

                                    return {
                                        suggestions: filteredTags.map((tag, index) => ({
                                            label: tag.label,
                                            kind: monaco.languages.CompletionItemKind.Snippet,
                                            insertText: tag.insertText,
                                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                            documentation: tag.documentation,
                                            sortText: `7${index.toString().padStart(3, '0')}`,
                                            range: {
                                                startLineNumber: position.lineNumber,
                                                startColumn: position.column - partialTag.length,
                                                endLineNumber: position.lineNumber,
                                                endColumn: position.column
                                            }
                                        }))
                                    }
                                }
                            }

                            // Emmet pattern detection
                            if (lang === 'css' || lang === 'scss') {
                                const cssEmmetPattern = /(?:^|\s)([a-zA-Z][a-zA-Z0-9]*(?:[-][a-zA-Z0-9]+)*|[a-z]+:[a-z0-9-]+|[.#][a-zA-Z0-9-_]+|@[a-zA-Z0-9-]+)$/
                                const match = textUntilPosition.match(cssEmmetPattern)
                                
                                if (match) {
                                    const abbr = match[1]
                                    return {
                                        suggestions: [{
                                            label: `${abbr} → CSS Emmet`,
                                            kind: monaco.languages.CompletionItemKind.Snippet,
                                            insertText: abbr,
                                            documentation: `Press Tab to expand CSS Emmet abbreviation: ${abbr}`,
                                            sortText: '7' + abbr,
                                            preselect: false
                                        }]
                                    }
                                }
                            } else {
                                const emmetPattern = /(?:^|\s)([a-zA-Z][a-zA-Z0-9]*(?:[.#][a-zA-Z0-9-_]+)*)$/
                                const match = textUntilPosition.match(emmetPattern)
                                
                                if (match) {
                                    const abbr = match[1]
                                    return {
                                        suggestions: [{
                                            label: `${abbr} → Emmet`,
                                            kind: monaco.languages.CompletionItemKind.Snippet,
                                            insertText: abbr,
                                            documentation: `Press Tab to expand Emmet abbreviation: ${abbr}`,
                                            sortText: '7' + abbr,
                                            preselect: false
                                        }]
                                    }
                                }
                            }

                            return { suggestions: [] }
                        }
                    })
                    
                    disposables.push(disposable)
                })

                // Handle Tab key for Emmet expansion
                editor.addAction({
                    id: 'emmet-expand-tab',
                    label: 'Expand Emmet Abbreviation',
                    keybindings: [monaco.KeyCode.Tab],
                    precondition: 'editorTextFocus && !inSnippetMode',
                    run: (ed: any) => {
                        const position = ed.getPosition()
                        const model = ed.getModel()

                        if (!position || !model) return false

                        const lineContent = model.getLineContent(position.lineNumber)
                        const textUntilPosition = lineContent.substr(0, position.column - 1)
                        const languageId = model.getLanguageId()

                        // Don't interfere with regular indentation if line is empty
                        if (!textUntilPosition.trim()) {
                            const tabSize = model.getOptions().tabSize
                            const insertSpaces = model.getOptions().insertSpaces
                            const insertText = insertSpaces ? ' '.repeat(tabSize) : '\t'
                            
                            ed.executeEdits('tab', [{
                                range: new monaco.Range(
                                    position.lineNumber, position.column,
                                    position.lineNumber, position.column
                                ),
                                text: insertText
                            }])
                            return true
                        }

                        // Check for Emmet pattern
                        let emmetPattern: RegExp, match: RegExpMatchArray | null
                        
                        if (languageId === 'css' || languageId === 'scss') {
                            emmetPattern = /(?:^|\s)([a-zA-Z][a-zA-Z0-9]*(?:[-][a-zA-Z0-9]+)*|[a-z]+:[a-z0-9-]+|[.#][a-zA-Z0-9-_]+|@[a-zA-Z0-9-]+)$/
                            match = textUntilPosition.match(emmetPattern)
                            if (match) {
                                match = [match[1]]
                            }
                        } else {
                            emmetPattern = /[\w.#>+*\[\]{}@()\-:]+$/
                            match = textUntilPosition.match(emmetPattern)
                            
                            // Enhanced PHP context detection for Tab expansion
                            if (match && languageId === 'php') {
                                const lastPhpOpen = textUntilPosition.lastIndexOf('<?')
                                const lastPhpClose = textUntilPosition.lastIndexOf('?>')
                                const insidePHP = lastPhpOpen > lastPhpClose
                                
                                // Don't expand Emmet inside PHP tags
                                if (insidePHP) {
                                    match = null
                                }
                                
                                // Don't expand PHP function names as Emmet
                                const matchText = match[0]
                                if (matchText.match(/^(get_|wp_|add_|remove_|update_|delete_|the_|is_|has_)[a-zA-Z0-9_]*$/) ||
                                    matchText.match(/^\$[a-zA-Z0-9_]*$/) ||
                                    matchText.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                                    match = null
                                }
                            }
                            
                            // Original logic for other contexts
                            if (match && languageId !== 'scss' && textUntilPosition.includes('$') && !textUntilPosition.match(/^\$[\w\-]+$/)) {
                                match = null
                            }
                        }

                        if (match) {
                            const abbr = match[0]
                            try {
                                let syntax = languageId
                                
                                if (languageId === 'php') {
                                    syntax = 'html'
                                } else if (languageId === 'scss') {
                                    syntax = 'css'
                                }
                                
                                const expanded = emmet.expandAbbreviation(abbr, {
                                    syntax: syntax,
                                    options: {
                                        'output.selfClosingStyle': 'html'
                                    }
                                })

                                if (expanded) {
                                    const range = {
                                        startLineNumber: position.lineNumber,
                                        startColumn: position.column - abbr.length,
                                        endLineNumber: position.lineNumber,
                                        endColumn: position.column
                                    }

                                    ed.executeEdits('emmet', [{
                                        range: range,
                                        text: expanded,
                                        forceMoveMarkers: true
                                    }])
                                    return true
                                }
                            } catch (e) {
                                console.debug('Emmet expansion failed:', e)
                            }
                        }
                        
                        // Fallback to regular tab behavior
                        const tabSize = model.getOptions().tabSize
                        const insertSpaces = model.getOptions().insertSpaces
                        const insertText = insertSpaces ? ' '.repeat(tabSize) : '\t'
                        
                        ed.executeEdits('tab', [{
                            range: new monaco.Range(
                                position.lineNumber, position.column,
                                position.lineNumber, position.column
                            ),
                            text: insertText
                        }])
                        return true
                    }
                })

                return () => {
                    disposables.forEach(d => d.dispose())
                }
            } catch (error) {
                console.error('Error loading Emmet:', error)
                return null
            }
        }

        const cleanup = loadEmmet()
        
        return () => {
            if (cleanup && typeof cleanup === 'function') {
                cleanup()
            }
        }
    }, [editor, monaco])
}