import React, { useEffect } from 'react';
import EditorList from './components/editor/EditorList';
import EditorHeader from './components/editor/EditorHeader';
import EditorMain from './components/editor/EditorMain';
import EditorSettings from './components/editor/EditorSettings';
import EditorNoPosts from './components/editor/EditorNoPosts';
import { Toast } from './components/ui';
import { compileScss, apiClient, errorHandler } from '../utils';
import { useEditor } from './hooks';

/**
 * Main App Content Component
 * Uses the EditorContext for state management
 */
const AppContent = () => {
    const {
        selectedPost,
        metaData,
        saveStatus,
        scssError,
        showToast,
        loading,
        groupedPosts,
        selectPost,
        updateMeta,
        updateTitle,
        setSaveStatus,
        setScssError,
        setShowToast,
        setLoading,
        refreshPosts,
        deletePost,
        setMetaData
    } = useEditor();

    // Initialize error handler with Toast system
    useEffect(() => {
        errorHandler.setNotificationHandler({
            show: (notification) => {
                setScssError(notification.message);
                setShowToast(true);
            }
        });
    }, [setScssError, setShowToast]);

    // These handlers maintain backwards compatibility with existing components
    const handlePostSelect = async (post) => {
        await selectPost(post);
    };

    const handleMetaChange = (section, field, value) => {
        updateMeta(section, field, value);
    };

    const handleTitleUpdate = async (newTitle) => {
        await updateTitle(newTitle);
    };

    const handleToastClose = () => {
        setShowToast(false);
    };

    const handleOpenPartial = async (partialName) => {
        try {
            const data = await apiClient.getPosts({ per_page: 100 });
            const posts = data.posts || [];

            const targetPartial = posts.find(post =>
                post.terms?.some(term => term.slug === 'scss-partials') &&
                (post.title === partialName || post.slug === partialName)
            );

            if (targetPartial) {
                await handlePostSelect(targetPartial);
                setShowToast(false);
            } else {
                console.warn(`Partial "${partialName}" not found`);
            }
        } catch (error) {
            console.error('Error opening partial:', error);
        }
    };

    const handleSave = async () => {
        if (!selectedPost || saveStatus === 'saving') return;

        setSaveStatus('saving');
        const startTime = Date.now();

        try {
            const hasScssContent = metaData?.blocks?.scss || metaData?.blocks?.editorScss;

            if (hasScssContent && selectedPost.terms?.some(term => term.slug === 'blocks')) {
                const postId = selectedPost.id;

                // Compile regular SCSS if present
                if (metaData.blocks.scss) {
                    try {
                        const scssContent = metaData.blocks.scss;
                        const compiledCss = await compileScss(scssContent, postId);

                        await apiClient.saveScssContent(postId, {
                            scss_content: scssContent,
                            css_content: compiledCss,
                        });
                    } catch (error) {
                        console.error('SCSS compilation failed:', error);
                        setScssError(error.message || 'Failed to compile SCSS');
                        setSaveStatus('error');
                        setShowToast(true);
                        return;
                    }
                }

                // Compile editor SCSS if present
                if (metaData.blocks.editorScss) {
                    try {
                        const editorScssContent = metaData.blocks.editorScss;
                        const currentPartials = metaData.blocks.editor_selected_partials
                            ? JSON.parse(metaData.blocks.editor_selected_partials)
                            : [];

                        const editorCssContent = await compileScss(
                            editorScssContent,
                            postId,
                            currentPartials,
                            true
                        );

                        await apiClient.saveEditorScssContent(postId, {
                            editor_scss_content: editorScssContent,
                            editor_css_content: editorCssContent,
                        });
                    } catch (error) {
                        console.error('Editor SCSS compilation failed:', error);
                        setScssError(error.message || 'Failed to compile editor SCSS');
                        setSaveStatus('error');
                        setShowToast(true);
                        return;
                    }
                }

                setScssError(null);
            }

            // Save metadata
            const updates = [{
                id: selectedPost.id,
                meta: metaData
            }];

            await apiClient.batchUpdatePosts(updates);

            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, 1000 - elapsedTime);

            setTimeout(() => {
                setSaveStatus('saved');
                setTimeout(() => {
                    setSaveStatus('');
                }, 2000);
            }, remainingTime);

        } catch (error) {
            console.error('Error saving:', error);
            setSaveStatus('error');
            setScssError(error.message || 'Failed to save');
            setShowToast(true);
        }
    };

    const handleCreatePost = async (postData) => {
        try {
            const newPost = await apiClient.createPost(postData);
            await refreshPosts();
            if (newPost?.id) {
                await handlePostSelect(newPost);
            }
            return newPost;
        } catch (error) {
            console.error('Error creating post:', error);
            throw error;
        }
    };

    const handlePostDelete = async (deletedPostId) => {
        await deletePost(deletedPostId);
    };

    // Load initial posts
    useEffect(() => {
        refreshPosts();
    }, []);

    return (
        <div className="w-full h-screen overflow-hidden flex flex-col relative text-base">
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <div className="text-highlight text-2xl">Loading...</div>
                </div>
            ) : (
                <>
                    <EditorHeader />
                    <div className="flex flex-1 overflow-hidden">
                        <EditorList
                            groupedPosts={groupedPosts}
                            selectedPost={selectedPost}
                            onPostSelect={handlePostSelect}
                            onPostCreate={handleCreatePost}
                            onPostDelete={handlePostDelete}
                        />
                        {selectedPost ? (
                            <>
                                <EditorMain
                                    selectedPost={selectedPost}
                                    onTitleUpdate={handleTitleUpdate}
                                />
                                <EditorSettings
                                    selectedPost={selectedPost}
                                    metaData={metaData}
                                    onMetaChange={handleMetaChange}
                                    onSave={handleSave}
                                    saveStatus={saveStatus}
                                />
                            </>
                        ) : (
                            <EditorNoPosts />
                        )}
                    </div>

                    {showToast && scssError && (
                        <Toast
                            message={scssError}
                            type="error"
                            onClose={handleToastClose}
                            duration={5000}
                            onOpenPartial={handleOpenPartial}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default AppContent;