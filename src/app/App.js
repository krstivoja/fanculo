import React, { useState, useEffect, useCallback, useMemo } from "react";
import EditorList from "./components/editor/EditorList";
import EditorHeader from "./components/editor/EditorHeader";
import EditorMain from "./components/editor/EditorMain";
import EditorSettings from "./components/editor/EditorSettings";
import EditorNoPosts from "./components/editor/EditorNoPosts";
import { Toast } from "./components/ui";
import { compileScss, apiClient, errorHandler } from "../utils";
import { useHotReloadSave } from "../hooks/useHotReload";
import "./style.css";

const App = () => {
  const [groupedPosts, setGroupedPosts] = useState({
    blocks: [],
    symbols: [],
    "scss-partials": [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [metaData, setMetaData] = useState({});
  const [saveStatus, setSaveStatus] = useState("");
  const [scssError, setScssError] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // Initialize error handler with Toast system
  React.useEffect(() => {
    errorHandler.setNotificationHandler({
      show: (notification) => {
        // Integrate with existing Toast system
        setScssError(notification.message);
        setShowToast(true);
      },
    });
  }, []);

  // Fetch post with related data using optimized batch operation
  const handlePostSelect = useCallback(async (post) => {
    // Always use batch operation to get complete post data with related info
    const postWithRelated = await apiClient.getPostWithRelated(post.id);
    const fullPost = postWithRelated.post;

    setSelectedPost(fullPost);
    setMetaData(fullPost.meta || {});
    setSaveStatus("");
    setScssError(null);

    // Store related data for potential use
    if (postWithRelated.related) {
    }
  }, []);

  // Handle meta field changes
  const handleMetaChange = useCallback((section, field, value) => {
    setMetaData((prev) => {
      const newMetaData = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
      return newMetaData;
    });
    setSaveStatus("unsaved");

    // Clear SCSS error when user makes changes
    if (section === "blocks" && field === "scss") {
      setScssError(null);
      setShowToast(false);
    }
  }, []);

  // Update post title
  const handleTitleUpdate = useCallback(async (newTitle) => {
    if (!selectedPost?.id) return;

    try {
      // Use centralized API client to update post title
      const updatedPost = await apiClient.updatePost(selectedPost.id, {
        title: newTitle,
      });
      setSelectedPost(updatedPost);
    } catch (error) {
      console.error("Error updating title:", error);
      throw error;
    }
  }, [selectedPost?.id]);

  // Handle toast close
  const handleToastClose = useCallback(() => {
    setShowToast(false);
  }, []);

  // Handle opening partial for editing from toast
  const handleOpenPartial = useCallback(async (partialName) => {
    try {
      // Find the partial post by title/name using centralized API client
      const data = await apiClient.getPosts({ per_page: 100 });
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

        // Always use optimized batch operation
        const partialWithRelated = await apiClient.getPostWithRelated(
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
  }, []);

  // Get current partials data for compilation
  const getCurrentPartials = useMemo(() => {
    return async () => {
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
            console.warn("Failed to parse current selected partials:", e);
          }
        }

        // Enrich selected partial IDs with their data
        const enrichedSelectedPartials = [];
        if (Array.isArray(selectedPartialIds)) {
          // Create a combined lookup map for efficiency
          const allPartials = [...globalPartials, ...availablePartials];
          const partialsLookup = {};
          allPartials.forEach((partial) => {
            partialsLookup[partial.id] = partial;
          });

          selectedPartialIds.forEach((partialId, index) => {
            // Handle both number and string IDs
            const id =
              typeof partialId === "string" ? parseInt(partialId) : partialId;
            const partialData = partialsLookup[id];

            if (partialData) {
              enrichedSelectedPartials.push({
                id: partialData.id,
                title: partialData.title,
                slug: partialData.slug,
                order: index + 1, // Use the order from the selected array
              });
            } else {
              // If partial data not found, create a minimal object
              console.warn(
                `Selected partial ${id} not found in available partials`
              );
              enrichedSelectedPartials.push({
                id: id,
                title: `Partial ${id}`,
                slug: `partial-${id}`,
                order: index + 1,
              });
            }
          });
        }

        return { globalPartials, selectedPartials: enrichedSelectedPartials };
      } catch (error) {
        console.error("Error getting current partials:", error);
        return { globalPartials: [], selectedPartials: [] };
      }
    };
  }, [metaData.blocks?.selected_partials]);

  // Original save function without hot reload
  const originalHandleSave = async () => {
    setSaveStatus("saving");

    try {
      if (selectedPost?.id) {
        // Attributes are now saved automatically via the updatePostMeta method in PostsApiController

        // Check if this is a block (not SCSS partial) and has SCSS content
        const hasScssContent =
          selectedPost.terms?.some((term) => term.slug === "blocks") &&
          metaData.blocks?.scss;

        if (hasScssContent) {
          try {
            // Get current partials data for real-time compilation
            const currentPartials = await getCurrentPartials();

            // Compile SCSS to CSS with current partials support
            const scssContent = metaData.blocks.scss;
            const cssContent = await compileScss(
              scssContent,
              selectedPost.id,
              currentPartials
            );

            // Save both SCSS and compiled CSS
            await apiClient.saveScssContent(selectedPost.id, {
              scss_content: scssContent,
              css_content: cssContent,
            });
          } catch (compilationError) {
            console.error("❌ SCSS compilation failed:", compilationError);
            const errorMessage =
              compilationError.message || "SCSS compilation failed";
            setScssError(errorMessage);
            setShowToast(true);
            // Continue with normal save even if SCSS compilation fails
          }
        }

        // Check if this is a block and has editor SCSS content
        const hasEditorScssContent =
          selectedPost.terms?.some((term) => term.slug === "blocks") &&
          metaData.blocks?.editorScss;

        if (hasEditorScssContent) {
          try {
            // Get editor partials for compilation
            const editorPartialsData = await apiClient.getScssPartials();
            const globalPartials = editorPartialsData.global_partials || [];
            const availablePartials =
              editorPartialsData.available_partials || [];

            // Parse editor selected partials
            let editorSelectedPartialIds = [];
            const editorSelectedPartialsString =
              metaData.blocks?.editor_selected_partials;
            if (editorSelectedPartialsString) {
              try {
                editorSelectedPartialIds = JSON.parse(
                  editorSelectedPartialsString
                );
              } catch (e) {
                console.warn("Failed to parse editor selected partials:", e);
              }
            } else {
            }

            // Enrich editor selected partial IDs with their data
            const enrichedEditorSelectedPartials = [];
            if (Array.isArray(editorSelectedPartialIds)) {
              const allPartials = [...globalPartials, ...availablePartials];

              const partialsLookup = {};
              allPartials.forEach((partial) => {
                partialsLookup[partial.id] = partial;
              });

              editorSelectedPartialIds.forEach((partialId, index) => {
                const id =
                  typeof partialId === "string"
                    ? parseInt(partialId)
                    : partialId;
                const partialData = partialsLookup[id];

                if (partialData) {
                  enrichedEditorSelectedPartials.push({
                    id: partialData.id,
                    title: partialData.title,
                    slug: partialData.slug,
                    order: index + 1,
                  });
                }
              });
            }

            const editorCurrentPartials = {
              globalPartials,
              selectedPartials: enrichedEditorSelectedPartials,
            };

            // Compile editor SCSS to CSS with partials support
            const editorScssContent = metaData.blocks.editorScss;
            // Pass null as postId to force using our provided editorCurrentPartials
            const editorCssContent = await compileScss(
              editorScssContent,
              null,
              editorCurrentPartials
            );

            // Save both editor SCSS and compiled CSS
            await apiClient.saveEditorScssContent(selectedPost.id, {
              editor_scss_content: editorScssContent,
              editor_css_content: editorCssContent,
            });
          } catch (compilationError) {
            console.error(
              "❌ Editor SCSS compilation failed:",
              compilationError
            );
            const errorMessage =
              compilationError.message || "Editor SCSS compilation failed";
            setScssError(errorMessage);
            setShowToast(true);
            // Continue with normal save even if editor SCSS compilation fails
          }
        }

        // Use batch operation to save meta data and regenerate files in one request
        await apiClient.savePostWithOperations(selectedPost.id, metaData, true);
      } else {
        // Just regenerate files if no meta changes
        await apiClient.regenerateFiles();
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3000);
      return true; // Return success for hot reload
    } catch (error) {
      console.error("Error saving/generating:", error);
      setSaveStatus("error");
      return false; // Return failure for hot reload
    }
  };

  // Hot reload-enabled save function
  const { saveWithHotReload } = useHotReloadSave(
    selectedPost?.id,
    originalHandleSave
  );

  // Use the wrapped save function
  const handleSave = saveWithHotReload;

  const fetchPosts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // Use the centralized API client to fetch posts
      const data = await apiClient.getPosts({ per_page: 100 });
      const posts = data.posts || [];

      // Pre-allocate arrays for better performance
      const grouped = {
        blocks: [],
        symbols: [],
        "scss-partials": [],
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
        const firstPost =
          grouped.blocks[0] ||
          grouped.symbols[0] ||
          grouped["scss-partials"][0];
        if (firstPost) {
          handlePostSelect(firstPost);
        }
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setGroupedPosts({
        blocks: [],
        symbols: [],
        "scss-partials": [],
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedPost, handlePostSelect]);

  // Function to refresh the posts list (can be called after creating new posts)
  const refreshPosts = useCallback(() => {
    fetchPosts(false);
  }, [fetchPosts]);

  // Handle post deletion
  const handlePostDelete = useCallback((deletedPostId) => {
    // Clear selected post if it was the one deleted
    if (selectedPost && selectedPost.id === deletedPostId) {
      setSelectedPost(null);
      setMetaData({});
      setSaveStatus("");
    }

    // Refresh the posts list to remove the deleted post
    refreshPosts();
  }, [selectedPost, refreshPosts]);

  // Handle post creation
  const handlePostCreate = useCallback(async (postData) => {
    try {
      // Use centralized API client to create post
      const newPost = await apiClient.createPost({
        title: postData.title,
        taxonomy_term: postData.type,
        status: "publish",
      });

      // Refresh posts to include the new post
      refreshPosts();
      // Auto-select the newly created post
      setTimeout(() => {
        handlePostSelect(newPost);
      }, 100);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post: " + error.message);
    }
  }, [refreshPosts, handlePostSelect]);

  useEffect(() => {
    // Always use the API call to get full meta data
    // The pre-loaded data doesn't include the full meta structure
    fetchPosts();

    // Fetch and console log all registered blocks
    const fetchRegisteredBlocks = async () => {
      try {
        const response = await apiClient.getRegisteredBlocks();
      } catch (error) {
        console.error("❌ Error fetching registered blocks:", error);
      }
    };

    fetchRegisteredBlocks();
  }, []);

  // Memoize computed values (must be before any early returns)
  const totalPosts = useMemo(() =>
    groupedPosts.blocks.length +
    groupedPosts.symbols.length +
    groupedPosts["scss-partials"].length,
    [groupedPosts.blocks.length, groupedPosts.symbols.length, groupedPosts["scss-partials"].length]
  );

  const toastIsVisible = useMemo(() =>
    showToast && scssError,
    [showToast, scssError]
  );

  const hasUnsavedChanges = useMemo(() =>
    saveStatus === "unsaved",
    [saveStatus]
  );

  if (loading) return <div>Loading...</div>;

  // Show empty state when no posts exist
  if (totalPosts === 0) {
    return (
      <>
        <div id="editor">
          <EditorHeader
            onSave={handleSave}
            saveStatus={saveStatus}
            hasUnsavedChanges={hasUnsavedChanges}
            onPostsRefresh={refreshPosts}
          />
          <EditorNoPosts onPostCreate={handlePostCreate} />
        </div>

        {/* Toast for SCSS compilation errors */}
        <Toast
          message={scssError}
          type="error"
          title="SCSS Compilation Error"
          isVisible={toastIsVisible}
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
          hasUnsavedChanges={hasUnsavedChanges}
          onPostsRefresh={refreshPosts}
        />

        <div className="flex w-full flex-1 min-h-0">
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
        isVisible={toastIsVisible}
        onClose={handleToastClose}
        onOpenPartial={handleOpenPartial}
      />
    </>
  );
};

export default App;
