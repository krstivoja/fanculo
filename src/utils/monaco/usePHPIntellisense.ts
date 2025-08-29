import { useEffect } from 'react'

/**
 * Hook to add PHP and WordPress autocompletion to Monaco Editor
 */
export default function usePHPIntellisense(editor: any, monaco: any) {
    useEffect(() => {
        if (!editor || !monaco) return
        
        const setupPHPIntellisense = () => {
            try {
                // Common PHP functions
                const phpFunctions = [
                    // PHP Core
                    { label: 'array', documentation: 'Creates an array', insertText: 'array($1)$0' },
                    { label: 'echo', documentation: 'Output one or more strings', insertText: 'echo $1;$0' },
                    { label: 'print_r', documentation: 'Prints human-readable information about a variable', insertText: 'print_r($1, true)$0' },
                    { label: 'var_dump', documentation: 'Dumps information about a variable', insertText: 'var_dump($1)$0' },
                    { label: 'isset', documentation: 'Determine if a variable is set and is not NULL', insertText: 'isset($1)$0' },
                    { label: 'empty', documentation: 'Determine whether a variable is empty', insertText: 'empty($1)$0' },
                    { label: 'function', documentation: 'Define a function', insertText: 'function ${1:name}(${2:$params}) {\n\t${3:// code}\n}$0' },
                    { label: 'foreach', documentation: 'Loop through an array', insertText: 'foreach (${1:$array} as ${2:$value}) {\n\t${3:// code}\n}$0' },
                    { label: 'if', documentation: 'If statement', insertText: 'if (${1:condition}) {\n\t${2:// code}\n}$0' },
                    { label: 'class', documentation: 'Define a class', insertText: 'class ${1:ClassName} {\n\t${2:// code}\n}$0' },

                    // WordPress Core Functions
                    { label: 'get_post_meta', documentation: 'Retrieve post meta field for a post', insertText: 'get_post_meta(${1:$post_id}, \'${2:meta_key}\', ${3:true})$0' },
                    { label: 'update_post_meta', documentation: 'Update post meta field based on post ID', insertText: 'update_post_meta(${1:$post_id}, \'${2:meta_key}\', ${3:$meta_value})$0' },
                    { label: 'add_action', documentation: 'Hooks a function to a specific action', insertText: 'add_action(\'${1:hook_name}\', \'${2:callback}\')$0' },
                    { label: 'add_filter', documentation: 'Hooks a function to a specific filter action', insertText: 'add_filter(\'${1:hook_name}\', \'${2:callback}\')$0' },
                    { label: 'wp_enqueue_script', documentation: 'Enqueue a script', insertText: 'wp_enqueue_script(\'${1:handle}\', ${2:$src}, ${3:$deps}, ${4:$ver})$0' },
                    { label: 'wp_enqueue_style', documentation: 'Enqueue a CSS stylesheet', insertText: 'wp_enqueue_style(\'${1:handle}\', ${2:$src}, ${3:$deps}, ${4:$ver})$0' },
                    { label: 'get_template_part', documentation: 'Load a template part into a template', insertText: 'get_template_part(\'${1:slug}\', \'${2:name}\')$0' },
                    { label: 'the_title', documentation: 'Display or retrieve the current post title', insertText: 'the_title()$0' },
                    { label: 'the_content', documentation: 'Display the post content', insertText: 'the_content()$0' },
                    { label: 'get_option', documentation: 'Retrieves an option value from the database', insertText: 'get_option(\'${1:option}\', ${2:default})$0' },
                    { label: 'update_option', documentation: 'Update an option in the database', insertText: 'update_option(\'${1:option}\', ${2:$value})$0' },
                    { label: 'esc_html', documentation: 'Escape HTML output', insertText: 'esc_html(${1:$text})$0' },
                    { label: 'esc_attr', documentation: 'Escape attribute output', insertText: 'esc_attr(${1:$text})$0' },
                    { label: 'esc_url', documentation: 'Escape URL output', insertText: 'esc_url(${1:$url})$0' },
                    { label: 'wp_kses_post', documentation: 'Sanitize content for allowed HTML tags for post content', insertText: 'wp_kses_post(${1:$content})$0' },
                    
                    // Gutenberg Block Functions
                    { label: 'get_block_wrapper_attributes', documentation: 'Get block wrapper attributes', insertText: 'get_block_wrapper_attributes(${1:$extra_attributes})$0' },
                    { label: 'register_block_type', documentation: 'Register a block type from metadata', insertText: 'register_block_type(${1:$block_json_file})$0' },
                    { label: 'render_block', documentation: 'Render a block', insertText: 'render_block(${1:$parsed_block})$0' }
                ]

                // WordPress snippets
                const wpSnippets = [
                    {
                        label: 'wpblock',
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
                        label: 'wpdynamic',
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
                    }
                ]

                // Register PHP completion provider
                const disposable = monaco.languages.registerCompletionItemProvider('php', {
                    triggerCharacters: ['$', '>', ':', '!', '.'],
                    provideCompletionItems: (model: any, position: any) => {
                        const textUntilPosition = model.getValueInRange({
                            startLineNumber: position.lineNumber,
                            startColumn: 1,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column
                        })

                        let suggestions: any[] = []

                        // Handle snippet completions (when starting with !)
                        if (textUntilPosition === '!' || textUntilPosition.endsWith(' !') || textUntilPosition.match(/!\w*$/)) {
                            return {
                                suggestions: wpSnippets.map(snippet => ({
                                    label: snippet.label,
                                    kind: monaco.languages.CompletionItemKind.Snippet,
                                    documentation: { value: snippet.documentation },
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    insertText: snippet.insertText,
                                    sortText: '0' + snippet.label,
                                    range: {
                                        startLineNumber: position.lineNumber,
                                        startColumn: textUntilPosition.lastIndexOf('!') + 1,
                                        endLineNumber: position.lineNumber,
                                        endColumn: position.column
                                    }
                                }))
                            }
                        }

                        // Handle PHP functions (inside PHP tags)
                        if (textUntilPosition.lastIndexOf('<?') > textUntilPosition.lastIndexOf('?>')) {
                            const functionSuggestions = phpFunctions.map(func => ({
                                label: func.label,
                                kind: monaco.languages.CompletionItemKind.Function,
                                documentation: { value: func.documentation },
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                insertText: func.insertText,
                                sortText: '1' + func.label
                            }))

                            suggestions = [...suggestions, ...functionSuggestions]
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