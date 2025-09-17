import React, { useState, useEffect } from 'react';
import EditorList from './components/editor/EditorList';
import EditorHeader from './components/editor/EditorHeader';
import EditorMain from './components/editor/EditorMain';
import EditorSettings from './components/editor/EditorSettings';
import EditorNoPosts from './components/editor/EditorNoPosts';
import { Toast } from './components/ui';
import { compileScss, saveScssAndCss } from '../utils/scssCompiler';
import apiClient from '../utils/FunculoApiClient.js';
import errorHandler from '../utils/ApiErrorHandler.js';
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

        // Otherwise, fetch full post data from the API using centralized client
        try {
            const fullPost = await apiClient.getPost(post.id);
            setSelectedPost(fullPost);
            setMetaData(fullPost.meta || {});
            setSaveStatus('');
            setScssError(null);
        } catch (error) {
            // Handle error with centralized error handler
            const errorInfo = errorHandler.handleError(error, {
                context: { action: 'fetch_post', postId: post.id },
                customMessage: 'Failed to load post details. Using basic information.',
                showNotification: false // Don't show notification, just log
            });

            console.error('Error fetching post data:', errorInfo);
            setSelectedPost(post);  // Fallback to basic post data
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
                await handlePostSelect(targetPartial);
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

                // Save specific post meta data using centralized API client
                console.log('📡 Saving meta data via API client:', metaData);
                await apiClient.updatePost(selectedPost.id, { meta: metaData });
                console.log('✅ Meta data saved successfully');
            }

            // Generate files using centralized API client
            await apiClient.regenerateFiles();
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