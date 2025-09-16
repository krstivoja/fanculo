import React, { useState, useEffect } from 'react';
import EditorList from './components/editor/EditorList';
import EditorHeader from './components/editor/EditorHeader';
import EditorMain from './components/editor/EditorMain';
import EditorSettings from './components/editor/EditorSettings';
import EditorNoPosts from './components/editor/EditorNoPosts';
import { Toast } from './components/ui';
import { compileScss, saveScssAndCss } from '../utils/scssCompiler';
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

    // Fetch individual post with full data when selected
    const handlePostSelect = async (post) => {

        // If the post already has terms and meta, use it directly
        if (post.terms && post.terms.length > 0) {
            setSelectedPost(post);
            setMetaData(post.meta || {});
            setSaveStatus('');
            setScssError(null);
            return;
        }

        // Otherwise, fetch full post data from the API
        try {
            const response = await fetch(`/wp-json/funculo/v1/post/${post.id}`, {
                headers: {
                    'X-WP-Nonce': window.wpApiSettings.nonce
                }
            });

            if (response.ok) {
                const fullPost = await response.json();
                setSelectedPost(fullPost);
                setMetaData(fullPost.meta || {});
                setSaveStatus('');
                setScssError(null);
            } else {
                console.error('Failed to fetch full post data');
                setSelectedPost(post);
                setMetaData({});
                setSaveStatus('');
                setScssError(null);
            }
        } catch (error) {
            console.error('Error fetching post:', error);
            setSelectedPost(post);
            setMetaData({});
            setSaveStatus('');
            setScssError(null);
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
            const response = await fetch(`/wp-json/funculo/v1/post/${selectedPost.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wpApiSettings.nonce
                },
                body: JSON.stringify({
                    title: newTitle
                })
            });

            if (response.ok) {
                const updatedPost = await response.json();
                setSelectedPost(updatedPost);
            } else {
                throw new Error('Failed to update title');
            }
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
            // Find the partial post by title/name
            const response = await fetch('/wp-json/funculo/v1/posts?per_page=100', {
                headers: {
                    'X-WP-Nonce': window.wpApiSettings.nonce
                }
            });

            if (response.ok) {
                const data = await response.json();
                const posts = data.posts || [];

                // Find the partial with matching title
                const targetPartial = posts.find(post =>
                    post.terms?.some(term => term.slug === 'scss-partials') &&
                    (post.title?.rendered === partialName || post.title === partialName)
                );

                if (targetPartial) {
                    // Close the toast and navigate to the partial
                    setShowToast(false);
                    await handlePostSelect(targetPartial);
                } else {
                    console.error('Partial not found:', partialName);
                }
            }
        } catch (error) {
            console.error('Error opening partial:', error);
        }
    };

    // Get current partials data for compilation
    const getCurrentPartials = async () => {
        try {
            // Get global partials from API
            const partialsResponse = await fetch('/wp-json/funculo/v1/scss-partials', {
                headers: {
                    'X-WP-Nonce': window.wpApiSettings.nonce
                }
            });

            let globalPartials = [];
            if (partialsResponse.ok) {
                const partialsData = await partialsResponse.json();
                globalPartials = partialsData.global_partials || [];
            }

            // Get selected partials from current state
            let selectedPartials = [];
            const selectedPartialsString = metaData.blocks?.selected_partials;
            if (selectedPartialsString) {
                try {
                    selectedPartials = JSON.parse(selectedPartialsString);
                } catch (e) {
                    console.warn('Failed to parse current selected partials:', e);
                }
            }

            return { globalPartials, selectedPartials };
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
                        const cssContent = await compileScss(scssContent, selectedPost.id, currentPartials);

                        console.log('✅ SCSS compiled successfully');

                        // Save both SCSS and compiled CSS
                        await saveScssAndCss(selectedPost.id, scssContent, cssContent);

                        console.log('✅ SCSS and CSS saved successfully');
                    } catch (compilationError) {
                        console.error('❌ SCSS compilation failed:', compilationError);
                        const errorMessage = compilationError.message || 'SCSS compilation failed';
                        setScssError(errorMessage);
                        setShowToast(true);
                        // Continue with normal save even if SCSS compilation fails
                    }
                }

                // Save specific post meta data
                console.log('📡 Sending PUT request to save meta data:', metaData);
                const response = await fetch(`/wp-json/funculo/v1/post/${selectedPost.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': window.wpApiSettings.nonce
                    },
                    body: JSON.stringify({
                        meta: metaData
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Save failed:', response.status, errorText);
                    throw new Error('Failed to save post data');
                } else {
                    console.log('✅ Meta data saved successfully');
                }
            }

            // Generate files (works with or without selected post)
            const generateResponse = await fetch('/wp-json/funculo/v1/regenerate-files', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wpApiSettings.nonce
                }
            });

            if (generateResponse.ok) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(''), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error('Error saving/generating:', error);
            setSaveStatus('error');
        }
    };

    const fetchPosts = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);

            // Use the custom Funculo API which includes taxonomy terms and meta data
            const response = await fetch('/wp-json/funculo/v1/posts?per_page=100', {
                headers: {
                    'X-WP-Nonce': window.wpApiSettings.nonce
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
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
            const response = await fetch('/wp-json/funculo/v1/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.wpApiSettings.nonce
                },
                body: JSON.stringify({
                    title: postData.title,
                    taxonomy_term: postData.type,
                    status: 'publish'
                })
            });

            if (response.ok) {
                const newPost = await response.json();
                // Refresh posts to include the new post
                refreshPosts();
                // Auto-select the newly created post
                setTimeout(() => {
                    handlePostSelect(newPost);
                }, 100);
            } else {
                throw new Error('Failed to create post');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post: ' + error.message);
        }
    };

    useEffect(() => {
        // Always use the API call to get full meta data
        // The pre-loaded data doesn't include the full meta structure
        fetchPosts();
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