import React, { useState, useEffect } from 'react';
import EditorList from './components/editor/EditorList';
import EditorHeader from './components/editor/EditorHeader';
import EditorMain from './components/editor/EditorMain';
import EditorSettings from './components/editor/EditorSettings';
import EditorNoPosts from './components/editor/EditorNoPosts';
import { Toast } from './components/ui';
import { compileScss, apiClient, errorHandler } from '../utils';
import './style.css';


const App = () => {
    const [groupedPosts, setGroupedPosts] = useState({
        blocks: [],
        symbols: [],
        'scss-partials': []
    });
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [metaData, setMetaData] = useState({});
    const [saveStatus, setSaveStatus] = useState('');
    const [scssError, setScssError] = useState(null);
    const [showToast, setShowToast] = useState(false);

    // Initialize error handler with Toast system
    React.useEffect(() => {
        errorHandler.setNotificationHandler({
            show: (notification) => {
                // Integrate with existing Toast system
                setScssError(notification.message);
                setShowToast(true);
            }
        });
    }, []);

    // Fetch post with related data using optimized batch operation
    const handlePostSelect = async (post) => {
        // Always use batch operation to get complete post data with related info
        const postWithRelated = await apiClient.getPostWithRelated(post.id);
        const fullPost = postWithRelated.post;

        setSelectedPost(fullPost);
        setMetaData(fullPost.meta || {});
        setSaveStatus('');
        setScssError(null);

        // Store related data for potential use
        if (postWithRelated.related) {
            console.log('📦 Related data loaded:', Object.keys(postWithRelated.related));
        }
    };

    // Handle meta field changes
    const handleMetaChange = (section, field, value) => {
        console.log('App.js handleMetaChange called:', { section, field, value });
        setMetaData(prev => {
            const newMetaData = {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            };
            console.log('New metaData after change:', newMetaData);
            return newMetaData;
        });
        setSaveStatus('unsaved');

        // Clear SCSS error when user makes changes
        if (section === 'blocks' && field === 'scss') {
            setScssError(null);
            setShowToast(false);
        }
    };

    // Update post title
    const handleTitleUpdate = async (newTitle) => {
        if (!selectedPost?.id) return;

        try {
            // Use centralized API client to update post title
            const updatedPost = await apiClient.updatePost(selectedPost.id, { title: newTitle });
            setSelectedPost(updatedPost);
        } catch (error) {
            console.error('Error updating title:', error);
            throw error;
        }
    };

    // Handle toast close
    const handleToastClose = () => {
        setShowToast(false);
    };

    // Handle opening partial for editing from toast
    const handleOpenPartial = async (partialName) => {
        try {
            // Find the partial post by title/name using centralized API client
            const data = await apiClient.getPosts({ per_page: 100 });
            const posts = data.posts || [];

            // Find the partial with matching title
            const targetPartial = posts.find(post =>
                post.terms?.some(term => term.slug === 'scss-partials') &&
                (post.title?.rendered === partialName || post.title === partialName)
            );

            if (targetPartial) {
                // Close the toast and navigate to the partial
                setShowToast(false);

                // Always use optimized batch operation
                const partialWithRelated = await apiClient.getPostWithRelated(targetPartial.id);
                const fullPartial = partialWithRelated.post;
                setSelectedPost(fullPartial);
                setMetaData(fullPartial.meta || {});
                setSaveStatus('');
                setScssError(null);
            } else {
                console.error('Partial not found:', partialName);
            }
        } catch (error) {
            console.error('Error opening partial:', error);
        }
    };

    // Get current partials data for compilation
    const getCurrentPartials = async () => {
        try {
            // Get global partials using centralized API client
            const partialsData = await apiClient.getScssPartials();
            const globalPartials = partialsData.global_partials || [];
            const availablePartials = partialsData.available_partials || [];

            // Get selected partial IDs from current state
            let selectedPartialIds = [];
            const selectedPartialsString = metaData.blocks?.selected_partials;
            if (selectedPartialsString) {
                try {
                    selectedPartialIds = JSON.parse(selectedPartialsString);
                } catch (e) {
                    console.warn('Failed to parse current selected partials:', e);
                }
            }

            // Enrich selected partial IDs with their data
            const enrichedSelectedPartials = [];
            if (Array.isArray(selectedPartialIds)) {
                // Create a combined lookup map for efficiency
                const allPartials = [...globalPartials, ...availablePartials];
                const partialsLookup = {};
                allPartials.forEach(partial => {
                    partialsLookup[partial.id] = partial;
                });

                selectedPartialIds.forEach((partialId, index) => {
                    // Handle both number and string IDs
                    const id = typeof partialId === 'string' ? parseInt(partialId) : partialId;
                    const partialData = partialsLookup[id];

                    if (partialData) {
                        enrichedSelectedPartials.push({
                            id: partialData.id,
                            title: partialData.title,
                            slug: partialData.slug,
                            order: index + 1  // Use the order from the selected array
                        });
                    } else {
                        // If partial data not found, create a minimal object
                        console.warn(`Selected partial ${id} not found in available partials`);
                        enrichedSelectedPartials.push({
                            id: id,
                            title: `Partial ${id}`,
                            slug: `partial-${id}`,
                            order: index + 1
                        });
                    }
                });
            }

            return { globalPartials, selectedPartials: enrichedSelectedPartials };
        } catch (error) {
            console.error('Error getting current partials:', error);
            return { globalPartials: [], selectedPartials: [] };
        }
    };

    // Save meta data
    const handleSave = async () => {
        setSaveStatus('saving');

        try {
            if (selectedPost?.id) {
                console.log('💾 Saving post data. MetaData being saved:', metaData);

                // Attributes are now saved automatically via the updatePostMeta method in PostsApiController

                // Check if this is a block (not SCSS partial) and has SCSS content
                const hasScssContent = selectedPost.terms?.some(term => term.slug === 'blocks') &&
                                     metaData.blocks?.scss;

                if (hasScssContent) {
                    console.log('🔄 Compiling SCSS for post:', selectedPost.title);

                    try {
                        // Get current partials data for real-time compilation
                        const currentPartials = await getCurrentPartials();
                        console.log('🔍 Current partials for compilation:', currentPartials);

                        // Compile SCSS to CSS with current partials support
                        const scssContent = metaData.blocks.scss;
                        console.log('🔄 Compiling SCSS with partials data:', currentPartials);
                        const cssContent = await compileScss(scssContent, selectedPost.id, currentPartials);

                        console.log('✅ SCSS compiled successfully');

                        // Save both SCSS and compiled CSS
                        await apiClient.saveScssContent(selectedPost.id, {
                            scss_content: scssContent,
                            css_content: cssContent,
                        });

                        console.log('✅ SCSS and CSS saved successfully');
                    } catch (compilationError) {
                        console.error('❌ SCSS compilation failed:', compilationError);
                        const errorMessage = compilationError.message || 'SCSS compilation failed';
                        setScssError(errorMessage);
                        setShowToast(true);
                        // Continue with normal save even if SCSS compilation fails
                    }
                }

                // Check if this is a block and has editor SCSS content
                const hasEditorScssContent = selectedPost.terms?.some(term => term.slug === 'blocks') &&
                                           metaData.blocks?.editorScss;

                console.log('🔍 Editor SCSS check:', {
                    isBlock: selectedPost.terms?.some(term => term.slug === 'blocks'),
                    hasEditorScss: !!metaData.blocks?.editorScss,
                    editorScssContent: metaData.blocks?.editorScss || '(empty)',
                    willCompile: hasEditorScssContent
                });

                if (hasEditorScssContent) {
                    console.log('🔄 Compiling Editor SCSS for post:', selectedPost.title);

                    try {
                        // Get editor partials for compilation
                        const editorPartialsData = await apiClient.getScssPartials();
                        const globalPartials = editorPartialsData.global_partials || [];
                        const availablePartials = editorPartialsData.available_partials || [];

                        // Parse editor selected partials
                        let editorSelectedPartialIds = [];
                        const editorSelectedPartialsString = metaData.blocks?.editor_selected_partials;
                        console.log('📝 Editor Selected Partials Raw String:', editorSelectedPartialsString);
                        if (editorSelectedPartialsString) {
                            try {
                                editorSelectedPartialIds = JSON.parse(editorSelectedPartialsString);
                                console.log('✅ Parsed Editor Selected Partial IDs:', editorSelectedPartialIds);
                            } catch (e) {
                                console.warn('Failed to parse editor selected partials:', e);
                            }
                        } else {
                            console.log('⚠️ No editor selected partials string found');
                        }

                        // Enrich editor selected partial IDs with their data
                        const enrichedEditorSelectedPartials = [];
                        if (Array.isArray(editorSelectedPartialIds)) {
                            const allPartials = [...globalPartials, ...availablePartials];
                            console.log('📚 All Available Partials for Lookup:', allPartials.map(p => ({ id: p.id, title: p.title })));

                            const partialsLookup = {};
                            allPartials.forEach(partial => {
                                partialsLookup[partial.id] = partial;
                            });

                            editorSelectedPartialIds.forEach((partialId, index) => {
                                const id = typeof partialId === 'string' ? parseInt(partialId) : partialId;
                                const partialData = partialsLookup[id];
                                console.log(`🔍 Looking up partial ID ${id}:`, partialData ? `Found - ${partialData.title}` : 'Not found');

                                if (partialData) {
                                    enrichedEditorSelectedPartials.push({
                                        id: partialData.id,
                                        title: partialData.title,
                                        slug: partialData.slug,
                                        order: index + 1
                                    });
                                }
                            });
                            console.log('💎 Enriched Editor Selected Partials:', enrichedEditorSelectedPartials);
                        }

                        const editorCurrentPartials = {
                            globalPartials,
                            selectedPartials: enrichedEditorSelectedPartials
                        };

                        console.log('🔍 Editor partials for compilation:', editorCurrentPartials);

                        // Compile editor SCSS to CSS with partials support
                        const editorScssContent = metaData.blocks.editorScss;
                        console.log('📝 Editor SCSS content to compile:', editorScssContent);
                        console.log('🚀 Calling compileScss for editor with partials:', {
                            hasContent: !!editorScssContent,
                            globalCount: editorCurrentPartials.globalPartials.length,
                            selectedCount: editorCurrentPartials.selectedPartials.length
                        });
                        // Pass null as postId to force using our provided editorCurrentPartials
                        const editorCssContent = await compileScss(editorScssContent, null, editorCurrentPartials);

                        console.log('✅ Editor SCSS compiled successfully');

                        console.log('📊 Editor CSS Compiled Output:', {
                            originalScss: editorScssContent,
                            compiledCss: editorCssContent,
                            cssLength: editorCssContent.length,
                            includesGlobalStyles: editorCssContent.includes('box-sizing') || editorCssContent.includes('font-size'),
                            includesSelectedStyles: editorCurrentPartials.selectedPartials.map(p => ({
                                title: p.title,
                                found: editorCssContent.includes(p.title) || editorCssContent.includes(p.slug)
                            }))
                        });

                        // Save both editor SCSS and compiled CSS
                        await apiClient.saveEditorScssContent(selectedPost.id, {
                            editor_scss_content: editorScssContent,
                            editor_css_content: editorCssContent,
                        });

                        console.log('✅ Editor SCSS and CSS saved successfully');
                        console.log('🎨 Final Editor CSS:', editorCssContent);
                    } catch (compilationError) {
                        console.error('❌ Editor SCSS compilation failed:', compilationError);
                        const errorMessage = compilationError.message || 'Editor SCSS compilation failed';
                        setScssError(errorMessage);
                        setShowToast(true);
                        // Continue with normal save even if editor SCSS compilation fails
                    }
                }

                // Use batch operation to save meta data and regenerate files in one request
                console.log('📡 Saving meta data and regenerating files via batch API:', metaData);
                await apiClient.savePostWithOperations(selectedPost.id, metaData, true);
                console.log('✅ Meta data saved and files regenerated successfully');
            } else {
                // Just regenerate files if no meta changes
                await apiClient.regenerateFiles();
            }

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error('Error saving/generating:', error);
            setSaveStatus('error');
        }
    };

    const fetchPosts = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);

            // Use the centralized API client to fetch posts
            const data = await apiClient.getPosts({ per_page: 100 });
            const posts = data.posts || [];

            // Pre-allocate arrays for better performance
            const grouped = {
                blocks: [],
                symbols: [],
                'scss-partials': []
            };

            // Group posts by their taxonomy terms
            for (let i = 0; i < posts.length; i++) {
                const post = posts[i];
                const terms = post.terms;

                if (terms && terms.length > 0) {
                    const termSlug = terms[0].slug;
                    if (grouped[termSlug]) {
                        grouped[termSlug].push(post);
                    }
                }
            }

            setGroupedPosts(grouped);

            // Auto-select the first available post if none is selected
            if (!selectedPost && showLoading) {
                const firstPost = grouped.blocks[0] || grouped.symbols[0] || grouped['scss-partials'][0];
                if (firstPost) {
                    handlePostSelect(firstPost);
                }
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            setGroupedPosts({
                blocks: [],
                symbols: [],
                'scss-partials': []
            });
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    // Function to refresh the posts list (can be called after creating new posts)
    const refreshPosts = () => {
        fetchPosts(false);
    };

    // Handle post deletion
    const handlePostDelete = (deletedPostId) => {
        // Clear selected post if it was the one deleted
        if (selectedPost && selectedPost.id === deletedPostId) {
            setSelectedPost(null);
            setMetaData({});
            setSaveStatus('');
        }

        // Refresh the posts list to remove the deleted post
        refreshPosts();
    };

    // Handle post creation
    const handlePostCreate = async (postData) => {
        try {
            // Use centralized API client to create post
            const newPost = await apiClient.createPost({
                title: postData.title,
                taxonomy_term: postData.type,
                status: 'publish'
            });

            // Refresh posts to include the new post
            refreshPosts();
            // Auto-select the newly created post
            setTimeout(() => {
                handlePostSelect(newPost);
            }, 100);
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post: ' + error.message);
        }
    };

    useEffect(() => {
        // Always use the API call to get full meta data
        // The pre-loaded data doesn't include the full meta structure
        fetchPosts();

        // Fetch and console log all registered blocks
        const fetchRegisteredBlocks = async () => {
            try {
                const response = await apiClient.getRegisteredBlocks();
                console.log('🧱 All Registered WordPress Blocks:', response.blocks);
                console.log('📊 Total Blocks Count:', response.total);
                console.log('🕐 Timestamp:', response.timestamp);
            } catch (error) {
                console.error('❌ Error fetching registered blocks:', error);
            }
        };

        fetchRegisteredBlocks();
    }, []);

    if (loading) return <div>Loading...</div>;

    const totalPosts = groupedPosts.blocks.length + groupedPosts.symbols.length + groupedPosts['scss-partials'].length;

    // Show empty state when no posts exist
    if (totalPosts === 0) {
        return (
            <>
                <div id="editor">
                    <EditorHeader
                        onSave={handleSave}
                        saveStatus={saveStatus}
                        hasUnsavedChanges={saveStatus === 'unsaved'}
                        onPostsRefresh={refreshPosts}
                    />
                    <EditorNoPosts onPostCreate={handlePostCreate} />
                </div>

                {/* Toast for SCSS compilation errors */}
                <Toast
                    message={scssError}
                    type="error"
                    title="SCSS Compilation Error"
                    isVisible={showToast && scssError}
                    onClose={handleToastClose}
                    onOpenPartial={handleOpenPartial}
                />

            </>
        );
    }

    return (
        <>
            <div id="editor">
                <EditorHeader
                    onSave={handleSave}
                    saveStatus={saveStatus}
                    hasUnsavedChanges={saveStatus === 'unsaved'}
                    onPostsRefresh={refreshPosts}
                />

                <div className='flex w-full flex-1 min-h-0'>
                    <EditorList
                        groupedPosts={groupedPosts}
                        selectedPost={selectedPost}
                        onPostSelect={handlePostSelect}
                        onPostsRefresh={refreshPosts}
                    />
                    <EditorMain
                        selectedPost={selectedPost}
                        metaData={metaData}
                        onMetaChange={handleMetaChange}
                        onTitleUpdate={handleTitleUpdate}
                    />
                    <EditorSettings
                        selectedPost={selectedPost}
                        metaData={metaData}
                        onMetaChange={handleMetaChange}
                        onPostDelete={handlePostDelete}
                    />
                </div>
            </div>

            {/* Toast for SCSS compilation errors */}
            <Toast
                message={scssError}
                type="error"
                title="SCSS Compilation Error"
                isVisible={showToast && scssError}
                onClose={handleToastClose}
                onOpenPartial={handleOpenPartial}
            />

        </>
    );
};

export default App;