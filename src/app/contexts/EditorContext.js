import React, { createContext, useState, useCallback, useMemo } from 'react';
import { apiClient } from '../../utils';

/**
 * Editor Context for managing post editor state
 * Provides centralized state management to eliminate props drilling
 */
const EditorContext = createContext(null);

/**
 * Editor Provider Component
 * Manages all editor-related state and provides methods to update it
 */
export const EditorProvider = ({ children }) => {
  // Core State
  const [selectedPost, setSelectedPost] = useState(null);
  const [metaData, setMetaData] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const [scssError, setScssError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);

  // Groups posts state
  const [groupedPosts, setGroupedPosts] = useState({
    blocks: [],
    symbols: [],
    'scss-partials': []
  });

  /**
   * Select a post and load its metadata
   */
  const selectPost = useCallback(async (post) => {
    if (!post) {
      setSelectedPost(null);
      setMetaData({});
      return;
    }

    try {
      setLoading(true);
      // Use batch operation to get complete post data with related info
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
    } catch (error) {
      console.error('Error loading post:', error);
      setScssError(error.message);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update metadata with immutability guaranteed
   */
  const updateMeta = useCallback((section, field, value) => {
    console.log('EditorContext updateMeta:', { section, field, value });

    setMetaData(prev => {
      // Deep clone to ensure immutability
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

    // Clear SCSS error when user makes changes to SCSS fields
    if (section === 'blocks' && (field === 'scss' || field === 'editorScss')) {
      setScssError(null);
      setShowToast(false);
    }
  }, []);

  /**
   * Update entire meta section at once
   */
  const updateMetaSection = useCallback((section, data) => {
    setMetaData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...data
      }
    }));
    setSaveStatus('unsaved');
  }, []);

  /**
   * Update post title
   */
  const updateTitle = useCallback(async (newTitle) => {
    if (!selectedPost?.id) return;

    try {
      setLoading(true);
      const updatedPost = await apiClient.updatePost(selectedPost.id, { title: newTitle });
      setSelectedPost(updatedPost);
      setSaveStatus('saved');
      return updatedPost;
    } catch (error) {
      console.error('Error updating title:', error);
      setScssError(error.message);
      setShowToast(true);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedPost]);

  /**
   * Save all metadata changes
   */
  const saveMetaData = useCallback(async () => {
    if (!selectedPost?.id || saveStatus !== 'unsaved') return;

    try {
      setSaveStatus('saving');

      // Use batch update for better performance
      await apiClient.updatePost(selectedPost.id, {
        meta: metaData
      });

      setSaveStatus('saved');

      // Clear save status after 2 seconds
      setTimeout(() => {
        setSaveStatus('');
      }, 2000);

      return true;
    } catch (error) {
      console.error('Error saving metadata:', error);
      setSaveStatus('error');
      setScssError(error.message);
      setShowToast(true);
      return false;
    }
  }, [selectedPost, metaData, saveStatus]);

  /**
   * Refresh posts list
   */
  const refreshPosts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

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
          await selectPost(firstPost);
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
  }, [selectedPost, selectPost]);

  /**
   * Delete a post
   */
  const deletePost = useCallback(async (postId) => {
    try {
      setLoading(true);
      await apiClient.deletePost(postId);

      // Clear selected post if it was deleted
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
        setMetaData({});
      }

      // Refresh posts list
      await refreshPosts(false);

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      setScssError(error.message);
      setShowToast(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedPost, refreshPosts]);

  // Computed values
  const isDirty = useMemo(() => saveStatus === 'unsaved', [saveStatus]);
  const canSave = useMemo(() => isDirty && !loading, [isDirty, loading]);
  const isSaving = useMemo(() => saveStatus === 'saving', [saveStatus]);

  // Context value with all state and methods
  const value = useMemo(() => ({
    // State
    selectedPost,
    metaData,
    saveStatus,
    scssError,
    showToast,
    loading,
    groupedPosts,

    // Actions
    selectPost,
    updateMeta,
    updateMetaSection,
    updateTitle,
    saveMetaData,
    refreshPosts,
    deletePost,
    setSelectedPost,
    setMetaData,
    setSaveStatus,
    setScssError,
    setShowToast,
    setLoading,
    setGroupedPosts,

    // Computed
    isDirty,
    canSave,
    isSaving
  }), [
    selectedPost,
    metaData,
    saveStatus,
    scssError,
    showToast,
    loading,
    groupedPosts,
    selectPost,
    updateMeta,
    updateMetaSection,
    updateTitle,
    saveMetaData,
    refreshPosts,
    deletePost,
    isDirty,
    canSave,
    isSaving
  ]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export default EditorContext;