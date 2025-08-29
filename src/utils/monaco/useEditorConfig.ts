import { useEffect } from 'react'

/**
 * Combined hook to handle Monaco Editor configuration:
 * - Language configurations (HTML, PHP, CSS, SCSS)
 * - Auto-closing tags
 * - Enhanced language features
 */
export default function useEditorConfig(editor: any, monaco: any) {
    useEffect(() => {
        if (!editor || !monaco) return

        // Setup language configurations
        configureLanguages(monaco)
        
        // Setup custom auto-closing tags logic
        const autoCloseTagsDisposable = setupAutoClosingTags(editor, monaco)
        
        // Clean up
        return () => {
            if (autoCloseTagsDisposable) {
                autoCloseTagsDisposable.dispose()
            }
        }
    }, [editor, monaco])

    /**
     * Configure language settings for HTML, PHP, CSS, and SCSS
     */
    const configureLanguages = (monaco: any) => {
        try {
            // HTML language configuration
            monaco.languages.setLanguageConfiguration('html', {
                onEnterRules: [
                    {
                        beforeText: new RegExp('<([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$', 'i'),
                        afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
                        action: {
                            indentAction: monaco.languages.IndentAction.IndentOutdent
                        }
                    },
                    {
                        beforeText: new RegExp('<([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$', 'i'),
                        action: {
                            indentAction: monaco.languages.IndentAction.Indent
                        }
                    }
                ],
                autoClosingPairs: [
                    { open: '<', close: '>' },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" },
                ],
                autoCloseBefore: ";:.,=}])>` \n\t",
                folding: {
                    markers: {
                        start: new RegExp('^\\s*<!--\\s*#region\\b.*-->'),
                        end: new RegExp('^\\s*<!--\\s*#endregion\\b.*-->')
                    }
                }
            })

            // PHP language configuration
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
                    { open: "'", close: "'", notIn: ['string', 'comment'] },
                    { open: '<?php', close: '?>' },
                    { open: '<?=', close: '?>' },
                    { open: '<?', close: '?>' }
                ],
                surroundingPairs: [
                    { open: '{', close: '}' },
                    { open: '[', close: ']' },
                    { open: '(', close: ')' },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" },
                    { open: '<?php', close: '?>' },
                    { open: '<?=', close: '?>' },
                    { open: '<?', close: '?>' }
                ],
                folding: {
                    markers: {
                        start: new RegExp('^\\s*#region\\b'),
                        end: new RegExp('^\\s*#endregion\\b')
                    }
                }
            })

            // Register PHP tag completion provider
            monaco.languages.registerCompletionItemProvider('php', {
                triggerCharacters: ['<'],
                provideCompletionItems: (model: any, position: any) => {
                    const lineContent = model.getLineContent(position.lineNumber)
                    const textUntilPosition = lineContent.substr(0, position.column - 1)
                    const textAfterPosition = lineContent.substr(position.column - 1)
                    
                    // Check if we're starting a new tag with '<'
                    if (textUntilPosition.endsWith('<')) {
                        const hasAutoClosedBracket = textAfterPosition.startsWith('>')
                        const endColumn = hasAutoClosedBracket ? position.column + 1 : position.column
                        
                        return {
                            suggestions: [
                                {
                                    label: '<?php',
                                    kind: monaco.languages.CompletionItemKind.Snippet,
                                    insertText: '<?php\n\t$0\n?>',
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    documentation: 'PHP opening and closing tags',
                                    detail: 'PHP Block',
                                    sortText: '0001',
                                    range: {
                                        startLineNumber: position.lineNumber,
                                        startColumn: position.column - 1,
                                        endLineNumber: position.lineNumber,
                                        endColumn: endColumn
                                    }
                                },
                                {
                                    label: '<?=',
                                    kind: monaco.languages.CompletionItemKind.Snippet,
                                    insertText: '<?= $0 ?>',
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    documentation: 'PHP echo shorthand tags',
                                    detail: 'PHP Echo',
                                    sortText: '0002',
                                    range: {
                                        startLineNumber: position.lineNumber,
                                        startColumn: position.column - 1,
                                        endLineNumber: position.lineNumber,
                                        endColumn: endColumn
                                    }
                                }
                            ]
                        }
                    }
                    
                    return { suggestions: [] }
                }
            })

            // CSS language configuration
            monaco.languages.setLanguageConfiguration('css', {
                wordPattern: /(#?-?\d*\.\d\w*%?)|([@#!.:]?[\w-?]+%?)|[@#!.]/g,
                comments: {
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
                    { open: '"', close: '"' },
                    { open: "'", close: "'" }
                ],
                surroundingPairs: [
                    { open: '{', close: '}' },
                    { open: '[', close: ']' },
                    { open: '(', close: ')' },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" }
                ]
            })

            // SCSS language configuration
            monaco.languages.setLanguageConfiguration('scss', {
                wordPattern: /(#?-?\d*\.\d\w*%?)|([@#!.:]?[\w-?]+%?)|[@#!.]/g,
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
                    { open: '"', close: '"' },
                    { open: "'", close: "'" }
                ],
                surroundingPairs: [
                    { open: '{', close: '}' },
                    { open: '[', close: ']' },
                    { open: '(', close: ')' },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" }
                ],
                folding: {
                    markers: {
                        start: new RegExp('^\\s*\\/\\*\\s*#region\\b.*\\*\\/$'),
                        end: new RegExp('^\\s*\\/\\*\\s*#endregion\\b.*\\*\\/$')
                    }
                }
            })

            // Add SCSS specific completions
            monaco.languages.registerCompletionItemProvider('scss', {
                provideCompletionItems: (model: any, position: any) => {
                    const suggestions = [
                        {
                            label: '@import',
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: '@import \'$1\';',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Import SCSS file'
                        },
                        {
                            label: '@mixin',
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: '@mixin ${1:name}(${2:$params}) {\n\t$3\n}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Create a SCSS mixin'
                        },
                        {
                            label: '@include',
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: '@include ${1:mixin-name}($2);',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Include a SCSS mixin'
                        },
                        {
                            label: '@extend',
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: '@extend ${1:.class};',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Extend a SCSS class'
                        },
                        {
                            label: '@media',
                            kind: monaco.languages.CompletionItemKind.Keyword,
                            insertText: '@media (${1:max-width: 768px}) {\n\t$2\n}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: 'Media query'
                        }
                    ]
                    
                    return { suggestions }
                }
            })

        } catch (error) {
            console.error('Failed to set up language configurations:', error)
        }
    }

    /**
     * Setup custom auto-closing tags functionality
     */
    const setupAutoClosingTags = (editor: any, monaco: any) => {
        const enabledLanguages = ["html", "php"]

        const isSelfClosing = (tag: string) =>
            [
                "area", "base", "br", "col", "embed", "hr", "img", "input", 
                "link", "meta", "param", "source", "track", "wbr"
            ].includes(tag)

        return editor.onKeyDown((event: any) => {
            const model = editor.getModel()
            if (!model || !enabledLanguages.includes(model.getLanguageId())) {
                return
            }

            if (event.browserEvent.key === ">") {
                const currentSelections = editor.getSelections()
                
                const edits: any[] = []
                const newSelections: any[] = []
                
                for (const selection of currentSelections) {
                    newSelections.push(
                        new monaco.Selection(
                            selection.selectionStartLineNumber,
                            selection.selectionStartColumn + 1,
                            selection.endLineNumber,
                            selection.endColumn + 1,
                        ),
                    )
                    
                    const contentBeforeChange = model.getValueInRange({
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: selection.endLineNumber,
                        endColumn: selection.endColumn,
                    })

                    const match = contentBeforeChange.match(/<([\w-]+)(?![^>]*\/>)[^>]*$/)
                    if (!match) {
                        continue
                    }

                    const [fullMatch, tag] = match

                    if (isSelfClosing(tag) || fullMatch.trim().endsWith("/")) {
                        continue
                    }

                    edits.push({
                        range: {
                            startLineNumber: selection.endLineNumber,
                            startColumn: selection.endColumn + 1,
                            endLineNumber: selection.endLineNumber,
                            endColumn: selection.endColumn + 1,
                        },
                        text: `</${tag}>`,
                    })
                }

                if (edits.length > 0) {
                    setTimeout(() => {
                        editor.executeEdits(model.getValue(), edits, newSelections)
                    }, 0)
                }
            }
        })
    }
}