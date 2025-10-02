import { useCallback } from "react";
import { apiClient } from "../../utils";
import centralizedApi from "../../utils/api/CentralizedApiService";

/**
 * Custom hook for managing post operations (select, create, delete, etc.)
 */
export const usePostOperations = ({
  selectedPost,
  setSelectedPost,
  setMetaData,
  setSaveStatus,
  setScssError,
  setShowToast,
  saveStatus,
}) => {
  /**
   * Fetch post with related data using optimized batch operation
   */
  const handlePostSelect = useCallback(
    async (post) => {
      // If switching from a different post with unsaved changes, warn user
      if (selectedPost && selectedPost.id !== post.id && saveStatus === 'unsaved') {
        const confirmSwitch = window.confirm(
          "You have unsaved changes. Do you want to discard them?"
        );
        if (!confirmSwitch) {
          return;
        }
      }

      // Always use batch operation to get complete post data with related info
      const postWithRelated = await centralizedApi.getPostWithRelated(post.id);
      const fullPost = postWithRelated.post;

      console.log(
        "🔍 App.js handlePostSelect - fullPost.meta.blocks:",
        fullPost.meta?.blocks
      );
      console.log(
        "🔍 App.js handlePostSelect - selected_partials:",
        fullPost.meta?.blocks?.selected_partials,
        "selectedPartials:",
        fullPost.meta?.blocks?.selectedPartials
      );
      console.log(
        "🔍 App.js handlePostSelect - editor_selected_partials:",
        fullPost.meta?.blocks?.editor_selected_partials,
        "editorSelectedPartials:",
        fullPost.meta?.blocks?.editorSelectedPartials
      );

      setSelectedPost(fullPost);
      setMetaData(fullPost.meta || {});
      setSaveStatus("");
      setScssError(null);

      // Store related data for potential use
      if (postWithRelated.related) {
      }
    },
    [selectedPost, saveStatus, setSelectedPost, setMetaData, setSaveStatus, setScssError]
  );

  /**
   * Update post title - takes setGroupedPosts as parameter to avoid circular dependency
   */
  const handleTitleUpdate = useCallback(
    (setGroupedPosts) => async (newTitle) => {
      if (!selectedPost?.id) return;

      try {
        // Use centralized API client to update post title
        const updatedPost = await apiClient.updatePost(selectedPost.id, {
          title: newTitle,
        });
        setSelectedPost(updatedPost);

        // Also update the title in groupedPosts for consistency
        setGroupedPosts((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((key) => {
            updated[key] = updated[key].map((post) =>
              post.id === selectedPost.id
                ? { ...post, title: updatedPost.title }
                : post
            );
          });
          return updated;
        });
      } catch (error) {
        console.error("Error updating title:", error);
        throw error;
      }
    },
    [selectedPost?.id, setSelectedPost]
  );

  /**
   * Handle opening partial for editing from toast - use cached data when possible
   */
  const handleOpenPartial = useCallback(
    async (partialName) => {
      try {
        // Use cached posts data first, fall back to fresh fetch if needed
        const data = await centralizedApi.getPosts({ per_page: 100 });
        const posts = data.posts || [];

        // Find the partial with matching title
        const targetPartial = posts.find(
          (post) =>
            post.terms?.some((term) => term.slug === "scss-partials") &&
            (post.title?.rendered === partialName || post.title === partialName)
        );

        if (targetPartial) {
          // Close the toast and navigate to the partial
          setShowToast(false);

          // Use centralized API service with caching
          const partialWithRelated = await centralizedApi.getPostWithRelated(
            targetPartial.id
          );
          const fullPartial = partialWithRelated.post;
          setSelectedPost(fullPartial);
          setMetaData(fullPartial.meta || {});
          setSaveStatus("");
          setScssError(null);
        } else {
          console.error("Partial not found:", partialName);
        }
      } catch (error) {
        console.error("Error opening partial:", error);
      }
    },
    [setShowToast, setSelectedPost, setMetaData, setSaveStatus, setScssError]
  );

  /**
   * Handle post deletion with optimistic updates - takes setGroupedPosts as parameter
   */
  const handlePostDelete = useCallback(
    (setGroupedPosts) => (deletedPostId) => {
      // Optimistically update the UI first for immediate feedback
      setGroupedPosts((prevGrouped) => {
        const updated = { ...prevGrouped };

        // Remove the deleted post from the appropriate group
        Object.keys(updated).forEach((key) => {
          updated[key] = updated[key].filter(
            (post) => post.id !== deletedPostId
          );
        });

        return updated;
      });

      // Clear selected post if it was the one deleted
      if (selectedPost && selectedPost.id === deletedPostId) {
        setSelectedPost(null);
        setMetaData({});
        setSaveStatus("");
      }

      // No need to clear cache - deletion already handles cache invalidation
      // The optimistic update provides immediate UI feedback
    },
    [selectedPost, setSelectedPost, setMetaData, setSaveStatus]
  );

  /**
   * Handle post creation with optimistic updates - takes setGroupedPosts and refreshData as parameters
   */
  const handlePostCreate = useCallback(
    (setGroupedPosts, refreshData) => async (postData) => {
      try {
        // Create post via API
        const newPost = await centralizedApi.createPost({
          title: postData.title,
          taxonomy_term: postData.type,
          status: "publish",
        });

        // Optimistically add the new post to the UI
        setGroupedPosts((prevGrouped) => {
          const updated = { ...prevGrouped };
          const termSlug = postData.type;

          // Add to the appropriate group
          if (updated[termSlug]) {
            updated[termSlug] = [...updated[termSlug], newPost];
          }

          return updated;
        });

        // Auto-select the newly created post
        setTimeout(() => {
          handlePostSelect(newPost);
        }, 100);

        // Cache is already invalidated by createPost method
        // Optimistic update provides immediate UI feedback
      } catch (error) {
        console.error("Error creating post:", error);
        alert("Failed to create post: " + error.message);
        // Refresh data to get the actual state on error
        refreshData();
      }
    },
    [handlePostSelect]
  );

  return {
    handlePostSelect,
    handleTitleUpdate,
    handleOpenPartial,
    handlePostDelete,
    handlePostCreate,
  };
};
