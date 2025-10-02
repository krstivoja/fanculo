import React, { useState, useEffect, useCallback, useMemo } from "react";
import EditorList from "./components/editor/EditorList";
import EditorHeader from "./components/editor/EditorHeader";
import EditorMain from "./components/editor/EditorMain";
import EditorSettings from "./components/editor/EditorSettings";
import EditorNoPosts from "./components/editor/EditorNoPosts";
import { Toast } from "./components/ui";
import { compileScss, apiClient, errorHandler } from "../utils";
import centralizedApi from "../utils/api/CentralizedApiService";
import { useHotReloadSave } from "../hooks/useHotReload";
import "./style.css";

const App = () => {
  // Core data state
  const [groupedPosts, setGroupedPosts] = useState({
    blocks: [],
    symbols: [],
    "scss-partials": [],
  });
  const [selectedPost, setSelectedPost] = useState(null);
  const [metaData, setMetaData] = useState({});

  // Shared data state - fetched once and passed down to children
  const [sharedData, setSharedData] = useState({
    scssPartials: { globalPartials: [], availablePartials: [] },
    registeredBlocks: [],
    blockCategories: [],
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState({
    posts: true,
    scssPartials: true,
    registeredBlocks: true,
    blockCategories: true,
  });

  // App state
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
    console.log('🔵 [handlePostSelect] Selecting post:', post.id, post.title);

    // If switching from a different post with unsaved changes, warn user
    if (selectedPost && selectedPost.id !== post.id && saveStatus === 'unsaved') {
      const confirmSwitch = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmSwitch) {
        return;
      }
    }

    // Always use batch operation to get complete post data with related info
    const postWithRelated = await centralizedApi.getPostWithRelated(post.id);
    const fullPost = postWithRelated.post;

    console.log('🔵 [handlePostSelect] Fetched post data:', {
      postId: fullPost.id,
      title: fullPost.title,
      meta: fullPost.meta,
      scssContent: fullPost.meta?.scss_partials?.scss?.substring(0, 100) + '...'
    });

    setSelectedPost(fullPost);
    setMetaData(fullPost.meta || {});
    setSaveStatus("");
    setScssError(null);

    // Store related data for potential use
    if (postWithRelated.related) {
    }
  }, [selectedPost, saveStatus]);

  // Handle meta field changes
  const handleMetaChange = useCallback((section, field, value) => {
    console.log('🟡 [handleMetaChange] Changing meta:', {
      section,
      field,
      valuePreview: typeof value === 'string' ? value.substring(0, 100) + '...' : value,
      valueLength: typeof value === 'string' ? value.length : 'N/A'
    });

    setMetaData((prev) => {
      const newMetaData = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };

      console.log('🟡 [handleMetaChange] New metaData state:', {
        section,
        field,
        newSectionData: newMetaData[section]
      });

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
  const handleTitleUpdate = useCallback(
    async (newTitle) => {
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
    },
    [selectedPost?.id]
  );

  // Handle toast close
  const handleToastClose = useCallback(() => {
    setShowToast(false);
  }, []);

  // Handle opening partial for editing from toast - use cached data when possible
  const handleOpenPartial = useCallback(async (partialName) => {
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
  }, []);

  // Get current partials data for compilation
  const getCurrentPartials = useMemo(() => {
    return async () => {
      try {
        // Get global partials using centralized API service with caching
        const partialsData = await centralizedApi.getScssPartials();
        const globalPartials = partialsData.globalPartials || [];
        const availablePartials = partialsData.availablePartials || [];

        // Get selected partial IDs from current state
        // Support both snake_case (from API) and camelCase (from unsaved state)
        let selectedPartialIds = [];
        const selectedPartialsString =
          metaData.blocks?.selected_partials ||
          metaData.blocks?.selectedPartials;
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
  }, [metaData.blocks?.selected_partials, metaData.blocks?.selectedPartials]);

  // Original save function without hot reload
  const originalHandleSave = async () => {
    console.log('🟢 [originalHandleSave] Starting save for post:', selectedPost?.id);
    console.log('🟢 [originalHandleSave] Current metaData:', {
      blocks: metaData.blocks,
      symbols: metaData.symbols,
      scss_partials: metaData.scss_partials
    });

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
            console.log("🎨 === SCSS COMPILATION DEBUG ===");
            console.log("📝 1. Current metaData.blocks:", metaData.blocks);
            console.log(
              "📝 2. selected_partials (snake_case):",
              metaData.blocks?.selected_partials
            );
            console.log(
              "📝 3. selectedPartials (camelCase):",
              metaData.blocks?.selectedPartials
            );

            // Get current partials data for real-time compilation
            const currentPartials = await getCurrentPartials();

            console.log("📦 4. getCurrentPartials() returned:", {
              globalPartials: currentPartials.globalPartials?.map((p) => ({
                id: p.id,
                title: p.title,
              })),
              selectedPartials: currentPartials.selectedPartials?.map((p) => ({
                id: p.id,
                title: p.title,
              })),
              globalCount: currentPartials.globalPartials?.length || 0,
              selectedCount: currentPartials.selectedPartials?.length || 0,
            });

            // Compile SCSS to CSS with current partials support
            const scssContent = metaData.blocks.scss;
            console.log(
              "📄 5. Block SCSS content:",
              scssContent?.substring(0, 200) +
                (scssContent?.length > 200 ? "..." : "")
            );

            const cssContent = await compileScss(
              scssContent,
              selectedPost.id,
              currentPartials
            );

            console.log(
              "✅ 6. Compiled CSS result:",
              cssContent?.substring(0, 300) +
                (cssContent?.length > 300 ? "..." : "")
            );
            console.log("🎨 === END SCSS COMPILATION DEBUG ===");

            // Save both SCSS and compiled CSS
            await centralizedApi.saveScssContent(selectedPost.id, {
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
            const globalPartials = editorPartialsData.globalPartials || [];
            const availablePartials =
              editorPartialsData.availablePartials || [];

            // Parse editor selected partials
            // Support both snake_case (from API) and camelCase (from unsaved state)
            let editorSelectedPartialIds = [];
            const editorSelectedPartialsString =
              metaData.blocks?.editor_selected_partials ||
              metaData.blocks?.editorSelectedPartials;
            if (editorSelectedPartialsString) {
              try {
                editorSelectedPartialIds = JSON.parse(
                  editorSelectedPartialsString
                );
              } catch (e) {
                console.warn("Failed to parse editor selected partials:", e);
              }
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
            await centralizedApi.saveEditorScssContent(selectedPost.id, {
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
        console.log('🟢 [originalHandleSave] Calling savePostWithOperations with metaData:', metaData);
        const saveResult = await centralizedApi.savePostWithOperations(
          selectedPost.id,
          metaData,
          true
        );
        console.log('🟢 [originalHandleSave] Save result:', saveResult);

        // Don't refetch after save - keep local state as-is
        // The cache will be invalidated, so next time we select this post, we'll get fresh data
      } else {
        // Just regenerate files if no meta changes
        await centralizedApi.regenerateFiles();
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

  // Centralized data loading with cache warming and parallel fetching
  const loadAllData = useCallback(
    async (showInitialLoading = true) => {
      try {
        if (showInitialLoading) setLoading(true);

        // Warm cache in background for instant subsequent access
        centralizedApi.warmCache().catch((error) => {
          console.warn("Cache warming failed:", error);
        });

        // Load all shared data in parallel for maximum performance
        const [
          postsResult,
          scssPartialsResult,
          registeredBlocksResult,
          blockCategoriesResult,
        ] = await Promise.allSettled([
          centralizedApi.getPosts({ per_page: 100 }),
          centralizedApi.getScssPartials(),
          centralizedApi.getRegisteredBlocks(),
          centralizedApi.getBlockCategories(),
        ]);

        // Process posts data
        if (postsResult.status === "fulfilled") {
          const posts = postsResult.value.posts || [];
          const grouped = { blocks: [], symbols: [], "scss-partials": [] };

          // Group posts by taxonomy terms
          for (const post of posts) {
            const terms = post.terms;
            if (terms && terms.length > 0) {
              const termSlug = terms[0].slug;
              if (grouped[termSlug]) {
                grouped[termSlug].push(post);
              }
            }
          }
          setGroupedPosts(grouped);

          // Background preload commonly accessed posts
          const allPosts = [
            ...grouped.blocks,
            ...grouped.symbols,
            ...grouped["scss-partials"],
          ];
          if (allPosts.length > 1 && showInitialLoading) {
            const preloadIds = allPosts.slice(1, 4).map((post) => post.id);
            if (preloadIds.length > 0) {
              centralizedApi
                .getBatchPostsWithRelated(preloadIds)
                .catch((error) => {
                  console.warn("Background preloading failed:", error);
                });
            }
          }

          // Auto-select first post if none selected
          if (!selectedPost && showInitialLoading) {
            const firstPost =
              grouped.blocks[0] ||
              grouped.symbols[0] ||
              grouped["scss-partials"][0];
            if (firstPost) {
              handlePostSelect(firstPost);
            }
          }
        }

        // Update shared data state with results
        setSharedData((prevData) => ({
          ...prevData,
          scssPartials:
            scssPartialsResult.status === "fulfilled"
              ? scssPartialsResult.value
              : prevData.scssPartials,
          registeredBlocks:
            registeredBlocksResult.status === "fulfilled"
              ? Array.isArray(registeredBlocksResult.value)
                ? registeredBlocksResult.value
                : registeredBlocksResult.value?.blocks ||
                  registeredBlocksResult.value?.data ||
                  []
              : prevData.registeredBlocks,
          blockCategories:
            blockCategoriesResult.status === "fulfilled"
              ? Array.isArray(blockCategoriesResult.value)
                ? blockCategoriesResult.value
                : []
              : prevData.blockCategories,
        }));

        // Update individual loading states for fine-grained control
        setDataLoading({
          posts: postsResult.status !== "fulfilled",
          scssPartials: scssPartialsResult.status !== "fulfilled",
          registeredBlocks: registeredBlocksResult.status !== "fulfilled",
          blockCategories: blockCategoriesResult.status !== "fulfilled",
        });
      } catch (error) {
        console.error("Error loading app data:", error);
        setGroupedPosts({ blocks: [], symbols: [], "scss-partials": [] });
      } finally {
        if (showInitialLoading) setLoading(false);
      }
    },
    [selectedPost, handlePostSelect]
  );

  // Function to refresh all data (can be called after creating new posts)
  const refreshData = useCallback(() => {
    loadAllData(false);
  }, [loadAllData]);

  // Handle post deletion with optimistic updates
  const handlePostDelete = useCallback(
    (deletedPostId) => {
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
    [selectedPost]
  );

  // Handle post creation with optimistic updates
  const handlePostCreate = useCallback(
    async (postData) => {
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
    [handlePostSelect, refreshData]
  );

  useEffect(() => {
    // Load all shared data with cache warming on app initialization
    loadAllData();
  }, []);

  // Memoize computed values (must be before any early returns)
  const totalPosts = useMemo(
    () =>
      groupedPosts.blocks.length +
      groupedPosts.symbols.length +
      groupedPosts["scss-partials"].length,
    [
      groupedPosts.blocks.length,
      groupedPosts.symbols.length,
      groupedPosts["scss-partials"].length,
    ]
  );

  const toastIsVisible = useMemo(
    () => showToast && scssError,
    [showToast, scssError]
  );

  const hasUnsavedChanges = useMemo(
    () => saveStatus === "unsaved",
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
            onPostsRefresh={refreshData}
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
          onPostsRefresh={refreshData}
        />

        <div className="flex w-full flex-1 min-h-0">
          <EditorList
            groupedPosts={groupedPosts}
            selectedPost={selectedPost}
            onPostSelect={handlePostSelect}
            onPostsRefresh={refreshData}
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
            sharedData={sharedData}
            dataLoading={dataLoading}
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
