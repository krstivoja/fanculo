import { useEffect } from 'react'
import { completionCache } from './completionCache'

/**
 * Hook to add PHP and WordPress autocompletion to Monaco Editor
 */
export default function usePHPIntellisense(editor: any, monaco: any) {
    useEffect(() => {
        if (!editor || !monaco) return
        
        const setupPHPIntellisense = () => {
            try {
                // Get cached WordPress functions
                const wordpressFunctions = completionCache.getPHPCompletions('wordpress') || []
                const wordpressActions = completionCache.getWPHookCompletions('action') || []
                const wordpressFilters = completionCache.getWPHookCompletions('filter') || []

                // Basic PHP language constructs
                const phpConstructs = [
                    { label: 'array', documentation: 'Creates an array', insertText: 'array($1)$0', category: 'php-core' },
                    { label: 'echo', documentation: 'Output one or more strings', insertText: 'echo $1;$0', category: 'php-core' },
                    { label: 'print_r', documentation: 'Prints human-readable information about a variable', insertText: 'print_r($1, true)$0', category: 'php-core' },
                    { label: 'var_dump', documentation: 'Dumps information about a variable', insertText: 'var_dump($1)$0', category: 'php-core' },
                    { label: 'isset', documentation: 'Determine if a variable is set and is not NULL', insertText: 'isset($1)$0', category: 'php-core' },
                    { label: 'empty', documentation: 'Determine whether a variable is empty', insertText: 'empty($1)$0', category: 'php-core' },
                    { label: 'function', documentation: 'Define a function', insertText: 'function ${1:name}(${2:$params}) {\n\t${3:// code}\n}$0', category: 'php-core' },
                    { label: 'foreach', documentation: 'Loop through an array', insertText: 'foreach (${1:$array} as ${2:$value}) {\n\t${3:// code}\n}$0', category: 'php-core' },
                    { label: 'if', documentation: 'If statement', insertText: 'if (${1:condition}) {\n\t${2:// code}\n}$0', category: 'php-core' },
                    { label: 'class', documentation: 'Define a class', insertText: 'class ${1:ClassName} {\n\t${2:// code}\n}$0', category: 'php-core' }
                ]

                // Convert WordPress functions to Monaco completion format
                const wpFunctionCompletions = wordpressFunctions.map((func: any) => ({
                    label: func.label,
                    kind: monaco.languages.CompletionItemKind.Function,
                    documentation: { 
                        value: `${func.documentation}\n\n**Category:** ${func.category}\n**Since:** ${func.since || 'Unknown'}` 
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    insertText: func.insertText,
                    sortText: `1${func.label}`,
                    detail: `WordPress ${func.category}`
                }))

                // Convert WordPress hooks to Monaco completion format
                const wpActionCompletions = wordpressActions.map((action: any) => {
                    const priority = action.priority || 10;
                    const paramCount = action.parameters?.length || 1;
                    const insertText = `add_action('${action.name}', '` + '\\${1:callback}' + `', ${priority}, ${paramCount})$0`;
                    
                    return {
                        label: `add_action('${action.name}', ...)`,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        documentation: { 
                            value: `${action.description}\n\n**Parameters:** ${(action.parameters && action.parameters.join(', ')) || 'None'}` 
                        },
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: insertText,
                        sortText: `2${action.name}`,
                        detail: 'WordPress Action Hook'
                    }
                })

                const wpFilterCompletions = wordpressFilters.map((filter: any) => {
                    const priority = filter.priority || 10;
                    const paramCount = filter.parameters?.length || 1;
                    const insertText = `add_filter('${filter.name}', '` + '\\${1:callback}' + `', ${priority}, ${paramCount})$0`;
                    
                    return {
                        label: `add_filter('${filter.name}', ...)`,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        documentation: { 
                            value: `${filter.description}\n\n**Parameters:** ${(filter.parameters && filter.parameters.join(', ')) || 'None'}` 
                        },
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: insertText,
                        sortText: `3${filter.name}`,
                        detail: 'WordPress Filter Hook'
                    }
                })

                // Combine all completions
                const allFunctions = [
                    ...phpConstructs.map(construct => ({
                        label: construct.label,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        documentation: { value: construct.documentation },
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: construct.insertText,
                        sortText: `0${construct.label}`,
                        detail: 'PHP Core'
                    })),
                    ...wpFunctionCompletions,
                    ...wpActionCompletions,
                    ...wpFilterCompletions
                ]

                // WordPress snippets and shortcuts (using !wp prefix like the old plugin)
                const wpSnippets = [
                    {
                        label: '!wpblock',
                        documentation: 'WordPress block template with wrapper attributes',
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
                        ].join('\n')
                    },
                    {
                        label: '!wpdynamic',
                        documentation: 'WordPress dynamic block template',
                        insertText: [
                            '<?php',
                            '/**',
                            ' * Dynamic Block: ${1:Block Name}',
                            ' */',
                            '',
                            '$attributes = $attributes ?? [];',
                            '$posts = get_posts([',
                            '\t\'numberposts\' => $attributes[\'numberOfPosts\'] ?? 3,',
                            '\t\'post_status\' => \'publish\'',
                            ']);',
                            '?>',
                            '<div <?php echo get_block_wrapper_attributes(); ?>>',
                            '\t<?php if (!empty($posts)) : ?>',
                            '\t\t<?php foreach ($posts as $post) : ?>',
                            '\t\t\t<div class="post-item">',
                            '\t\t\t\t<h3><?php echo esc_html($post->post_title); ?></h3>',
                            '\t\t\t\t<div><?php echo wp_kses_post($post->post_excerpt); ?></div>',
                            '\t\t\t</div>',
                            '\t\t<?php endforeach; ?>',
                            '\t<?php endif; ?>',
                            '</div>'
                        ].join('\n')
                    },
                    {
                        label: '!wploop',
                        documentation: 'WordPress posts loop with safety checks',
                        insertText: [
                            '<?php if (have_posts()) : ?>',
                            '\t<?php while (have_posts()) : the_post(); ?>',
                            '\t\t<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>',
                            '\t\t\t<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>',
                            '\t\t\t<div class="entry-content">',
                            '\t\t\t\t<?php the_content(); ?>',
                            '\t\t\t</div>',
                            '\t\t</article>',
                            '\t<?php endwhile; ?>',
                            '<?php else : ?>',
                            '\t<p><?php esc_html_e(\'No posts found.\', \'textdomain\'); ?></p>',
                            '<?php endif; ?>'
                        ].join('\n')
                    },
                    {
                        label: '!wpaction',
                        documentation: 'WordPress action hook template',
                        insertText: [
                            '<?php',
                            'add_action(\'${1:hook_name}\', \'${2:callback_function}\', ${3:10}, ${4:1});',
                            '',
                            'function ${2:callback_function}(${5:$arg}) {',
                            '\t${6:// Code here}',
                            '}',
                            '${0}',
                            '?>'
                        ].join('\n')
                    }
                ]

                // Register PHP completion provider
                const disposable = monaco.languages.registerCompletionItemProvider('php', {
                    triggerCharacters: ['$', '>', ':', '!', '.', '_'],
                    provideCompletionItems: (model: any, position: any) => {
                        const textUntilPosition = model.getValueInRange({
                            startLineNumber: position.lineNumber,
                            startColumn: 1,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column
                        })

                        // Handle !wp prefix completions (works anywhere in PHP files)
                        const exclamationMatch = textUntilPosition.match(/!(\w*)$/)
                        if (exclamationMatch) {
                            const query = exclamationMatch[1].toLowerCase()
                            let suggestions: any[] = []

                            // For empty query (!) or wp query (!w, !wp), show WordPress snippets and functions
                            if (query === '' || 'wp'.startsWith(query)) {
                                // WordPress template snippets first
                                const snippetSuggestions = wpSnippets.map(snippet => ({
                                    label: snippet.label,
                                    kind: monaco.languages.CompletionItemKind.Snippet,
                                    documentation: { value: snippet.documentation },
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    insertText: snippet.insertText,
                                    sortText: '0' + snippet.label,
                                    filterText: snippet.label,
                                    range: {
                                        startLineNumber: position.lineNumber,
                                        startColumn: textUntilPosition.lastIndexOf('!') + 1,
                                        endLineNumber: position.lineNumber,
                                        endColumn: position.column
                                    }
                                }))

                                // Most common WordPress functions (top 15)
                                const commonFunctions = [
                                    'get_post_meta', 'update_post_meta', 'get_option', 'update_option',
                                    'wp_enqueue_script', 'wp_enqueue_style', 'add_action', 'add_filter',
                                    'esc_html', 'esc_attr', 'esc_url', 'get_posts', 'the_title', 'the_content',
                                    'get_block_wrapper_attributes'
                                ]

                                const popularFunctionSuggestions = allFunctions
                                    .filter((func: any) => commonFunctions.includes(func.label))
                                    .map((func: any) => ({
                                        label: '!' + func.label,
                                        kind: func.kind,
                                        documentation: func.documentation,
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        insertText: func.insertText,
                                        sortText: '1' + func.label,
                                        detail: func.detail,
                                        filterText: func.label,
                                        range: {
                                            startLineNumber: position.lineNumber,
                                            startColumn: textUntilPosition.lastIndexOf('!') + 1,
                                            endLineNumber: position.lineNumber,
                                            endColumn: position.column
                                        }
                                    }))

                                // Popular WordPress hooks (top 10 each)
                                const popularActions = ['init', 'wp_enqueue_scripts', 'admin_enqueue_scripts', 'wp_head', 'wp_footer']
                                const popularFilters = ['the_content', 'the_title', 'body_class', 'wp_nav_menu_items', 'render_block']

                                const actionHookSuggestions = wordpressActions
                                    .filter((action: any) => popularActions.includes(action.name))
                                    .map((action: any) => {
                                        const priority = action.priority || 10;
                                        const paramCount = (action.parameters && action.parameters.length) || 1;
                                        const insertText = `add_action('${action.name}', '` + '\\${1:callback}' + `', ${priority}, ${paramCount})$0`;
                                        
                                        return {
                                            label: `!add_action('${action.name}')`,
                                            kind: monaco.languages.CompletionItemKind.Snippet,
                                            documentation: { value: `${action.description}\n\n**Hook Type:** Action\n**Parameters:** ${(action.parameters && action.parameters.join(', ')) || 'None'}` },
                                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                            insertText: insertText,
                                            sortText: '2' + action.name,
                                            detail: 'WordPress Action Hook',
                                            filterText: `add_action ${action.name}`,
                                            range: {
                                                startLineNumber: position.lineNumber,
                                                startColumn: textUntilPosition.lastIndexOf('!') + 1,
                                                endLineNumber: position.lineNumber,
                                                endColumn: position.column
                                            }
                                        }
                                    })

                                const filterHookSuggestions = wordpressFilters
                                    .filter((filter: any) => popularFilters.includes(filter.name))
                                    .map((filter: any) => {
                                        const priority = filter.priority || 10;
                                        const paramCount = (filter.parameters && filter.parameters.length) || 1;
                                        const insertText = `add_filter('${filter.name}', '` + '\\${1:callback}' + `', ${priority}, ${paramCount})$0`;
                                        
                                        return {
                                            label: `!add_filter('${filter.name}')`,
                                            kind: monaco.languages.CompletionItemKind.Snippet,
                                            documentation: { value: `${filter.description}\n\n**Hook Type:** Filter\n**Parameters:** ${(filter.parameters && filter.parameters.join(', ')) || 'None'}` },
                                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                            insertText: insertText,
                                            sortText: '3' + filter.name,
                                            detail: 'WordPress Filter Hook',
                                            filterText: `add_filter ${filter.name}`,
                                            range: {
                                                startLineNumber: position.lineNumber,
                                                startColumn: textUntilPosition.lastIndexOf('!') + 1,
                                                endLineNumber: position.lineNumber,
                                                endColumn: position.column
                                            }
                                        }
                                    })

                                suggestions = [
                                    ...snippetSuggestions,
                                    ...popularFunctionSuggestions,
                                    ...actionHookSuggestions,
                                    ...filterHookSuggestions
                                ]
                            }

                            // For short queries, show template snippets + filtered functions
                            else if (query.length < 3) {
                                const snippetSuggestions = wpSnippets
                                    .filter(snippet => snippet.label.toLowerCase().includes(query))
                                    .map(snippet => ({
                                        label: snippet.label,
                                        kind: monaco.languages.CompletionItemKind.Snippet,
                                        documentation: { value: snippet.documentation },
                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                        insertText: snippet.insertText,
                                        sortText: '0' + snippet.label,
                                        filterText: snippet.label,
                                        range: {
                                            startLineNumber: position.lineNumber,
                                            startColumn: textUntilPosition.lastIndexOf('!') + 1,
                                            endLineNumber: position.lineNumber,
                                            endColumn: position.column
                                        }
                                    }))

                                suggestions = [...suggestions, ...snippetSuggestions]
                            }

                            // WordPress function search (like !wpget_post_ or !get_post_)
                            if (query.length >= 1) {
                                // Remove 'wp' prefix from query if present for function matching
                                const functionQuery = query.startsWith('wp') ? query.substring(2) : query
                                
                                const matchingFunctions = allFunctions.filter((func: any) => 
                                    func.label.toLowerCase().includes(functionQuery) ||
                                    func.label.toLowerCase().includes(query)
                                ).slice(0, 20) // Limit to top 20 matches

                                const functionSuggestions = matchingFunctions.map((func: any) => ({
                                    label: '!' + func.label,
                                    kind: func.kind,
                                    documentation: func.documentation,
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    insertText: func.insertText,
                                    sortText: '1' + func.label,
                                    detail: func.detail,
                                    filterText: func.label,
                                    range: {
                                        startLineNumber: position.lineNumber,
                                        startColumn: textUntilPosition.lastIndexOf('!') + 1,
                                        endLineNumber: position.lineNumber,
                                        endColumn: position.column
                                    }
                                }))

                                suggestions = [...suggestions, ...functionSuggestions]
                            }

                            return { suggestions }
                        }

                        let suggestions: any[] = []

                        // Handle PHP functions (inside PHP tags - regular autocomplete)
                        if (textUntilPosition.lastIndexOf('<?') > textUntilPosition.lastIndexOf('?>')) {
                            // Filter functions based on context for better performance
                            const contextualFunctions = allFunctions.filter((func: any) => {
                                const query = textUntilPosition.split(/[^a-zA-Z_]/).pop()?.toLowerCase() || ''
                                return !query || func.label.toLowerCase().includes(query)
                            })

                            suggestions = [...suggestions, ...contextualFunctions]
                        }

                        return { suggestions }
                    }
                })

                return disposable
            } catch (error) {
                console.error('Failed to load PHP/WordPress intellisense:', error)
                return null
            }
        }

        const disposable = setupPHPIntellisense()
        
        return () => {
            if (disposable && typeof disposable.dispose === 'function') {
                disposable.dispose()
            }
        }
    }, [editor, monaco])
}