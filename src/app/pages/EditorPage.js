import React, { useState, useEffect } from "react";
import EditorList from "../components/editor/EditorList";
import Header from "../components/editor/Header";
import MainContent from "../components/editor/MainContent";
import EditorSettings from "../components/editor/EditorSettings";
import EditorNoPosts from "../components/editor/EditorNoPosts";
import { Toast } from "../components/ui";
import { errorHandler, apiClient } from "../../utils";
import centralizedApi from "../../utils/api/CentralizedApiService";

import {
  useMetadata,
  hasListVisibleChanges,
  useScssCompilation,
  useAppData,
  usePostOperations,
  useHotReloadSave,
} from "../hooks";

const EditorPage = ({ searchParams, setSearchParams }) => {
  // UI state
  const [selectedPost, setSelectedPost] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [scssError, setScssError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [settingsTab, setSettingsTab] = useState("settings"); // Settings sidebar tab state

  // Metadata hook
  const { metaData, setMetaData, handleMetaChange } = useMetadata(
    setScssError,
    setShowToast
  );

  // SCSS compilation hook
  const { compileAllScss } = useScssCompilation(
    selectedPost,
    metaData,
    setScssError,
    setShowToast
  );

  // Post operations hook - must be defined before useAppData
  const postOperations = usePostOperations({
    selectedPost,
    setSelectedPost,
    setMetaData,
    setSaveStatus,
    setScssError,
    setShowToast,
    saveStatus,
  });

  // Data loading hook
  const {
    groupedPosts,
    setGroupedPosts,
    sharedData,
    loading,
    dataLoading,
    loadAllData,
    refreshData,
  } = useAppData(selectedPost, postOperations.handlePostSelect, searchParams);

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

  // Handle toast close
  const handleToastClose = () => {
    setShowToast(false);
  };

  // Update metadata change to set save status
  const handleMetaChangeWithStatus = (section, field, value) => {
    handleMetaChange(section, field, value);
    setSaveStatus("unsaved");
  };

  // Original save function without hot reload
  const originalHandleSave = async () => {
    setSaveStatus("saving");

    try {
      let hotReloadPayload = null;

      if (selectedPost?.id) {
        // Compile SCSS (both frontend and editor) if needed
        const scssCompilation = await compileAllScss();

        // Check if list-visible metadata changed (only icon affects the list display)
        const listMetadataChanged = hasListVisibleChanges(
          selectedPost.meta,
          metaData
        );

        // Use batch operation to save meta data and regenerate files in one request
        await centralizedApi.savePostWithOperations(
          selectedPost.id,
          metaData,
          true,
          { invalidateCollectionCache: listMetadataChanged }
        );

        // Optimistically update local state with saved data
        // This keeps Monaco and all UI in sync even if a re-render happens before cache refresh
        setSelectedPost((prev) => ({
          ...prev,
          meta: metaData,
        }));

        // Also update the post in groupedPosts to reflect meta changes in the list
        setGroupedPosts((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((key) => {
            updated[key] = updated[key].map((post) =>
              post.id === selectedPost.id ? { ...post, meta: metaData } : post
            );
          });
          return updated;
        });

        const blockMeta = metaData.blocks || {};
        const originalBlockMeta = selectedPost.meta?.blocks || {};
        const originalSymbolMeta = selectedPost.meta?.symbols || {};
        const frontendCompilation = scssCompilation?.frontend;
        const editorCompilation = scssCompilation?.editor;
        const changeSet = [];

        if (frontendCompilation) {
          changeSet.push("css");
        }
        if (editorCompilation) {
          changeSet.push("editorCss");
        }

        hotReloadPayload = {
          blockSlug: selectedPost.slug,
          blockName:
            selectedPost.title?.rendered ||
            selectedPost.title ||
            blockMeta?.title ||
            "",
          content: {
            css:
              frontendCompilation?.cssContent ??
              blockMeta?.cssContent ??
              originalBlockMeta?.cssContent ??
              blockMeta?.scss ??
              originalBlockMeta?.scss ??
              "",
            editorCss:
              editorCompilation?.cssContent ??
              blockMeta?.editorCssContent ??
              originalBlockMeta?.editorCssContent ??
              blockMeta?.editorScss ??
              originalBlockMeta?.editorScss ??
              "",
            php:
              blockMeta?.php ??
              originalBlockMeta?.php ??
              originalSymbolMeta?.php ??
              "",
            js: blockMeta?.js ?? originalBlockMeta?.js ?? "",
          },
        };

        if (changeSet.length > 0) {
          hotReloadPayload.changes = changeSet;
        }
      } else {
        // Just regenerate files if no meta changes
        await centralizedApi.regenerateFiles();
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3000);
      return { success: true, hotReloadPayload };
    } catch (error) {
      console.error("Error saving/generating:", error);
      setSaveStatus("error");
      return false; // Return failure for hot reload
    }
  };

  // Determine post type from selected post's terms
  const postType = selectedPost?.terms?.find((term) =>
    ["blocks", "symbols", "scss-partials"].includes(term.slug)
  )?.slug;

  const { saveWithHotReload } = useHotReloadSave(
    selectedPost?.id,
    originalHandleSave,
    postType
  );

  // Use the wrapped save function
  const handleSave = saveWithHotReload;

  useEffect(() => {
    // Load all shared data with cache warming on app initialization
    loadAllData();
  }, []);

  // Sync URL params with state - restore tab from URL on mount
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['settings', 'partials'].includes(tab)) {
      setSettingsTab(tab);
    }
  }, [searchParams]);

  // Sync state with URL - update URL when selected post or tab changes
  useEffect(() => {
    if (!setSearchParams) return;

    const params = new URLSearchParams();

    if (selectedPost?.id) {
      params.set('id', selectedPost.id.toString());
    }

    // Only include tab param if not default
    if (settingsTab !== 'settings') {
      params.set('tab', settingsTab);
    }

    setSearchParams(params, { replace: true });
  }, [selectedPost?.id, settingsTab, setSearchParams]);

  // Auto-recompile SCSS when block is marked for recompilation (e.g., when partial changes)
  useEffect(() => {
    const autoRecompilePostId = window._funculo_auto_recompile_post_id;

    if (autoRecompilePostId && selectedPost?.id === autoRecompilePostId) {
      // Clear the flag
      delete window._funculo_auto_recompile_post_id;

      // Clear the recompile meta flag and trigger compilation
      (async () => {
        try {
          await apiClient.updatePost(selectedPost.id, {
            post_id: selectedPost.id,
            meta: {
              _funculo_scss_needs_recompile: "0",
            },
          });
          await compileAllScss();
        } catch (error) {
          console.error("Auto-recompilation failed:", error);
        }
      })();
    }
  }, [selectedPost, compileAllScss]);

  const totalPosts =
    groupedPosts.blocks.length +
    groupedPosts.symbols.length +
    groupedPosts["scss-partials"].length;

  const toastIsVisible = showToast && scssError;

  if (loading) return <div>Loading...</div>;

  // Show empty state when no posts exist
  if (totalPosts === 0) {
    return (
      <>
        <div id="editor">
          <Header
            onSave={handleSave}
            saveStatus={saveStatus}
            onPostsRefresh={refreshData}
          />
          <EditorNoPosts
            onPostCreate={postOperations.handlePostCreate(
              setGroupedPosts,
              refreshData
            )}
          />
        </div>

        {/* Toast for SCSS compilation errors */}
        <Toast
          message={scssError}
          type="error"
          title="SCSS Compilation Error"
          isVisible={toastIsVisible}
          onClose={handleToastClose}
          onOpenPartial={postOperations.handleOpenPartial}
        />
      </>
    );
  }

  return (
    <>
      <div id="editor">
        <Header
          onSave={handleSave}
          saveStatus={saveStatus}
          onPostsRefresh={refreshData}
        />

        <div className="flex w-full flex-1 min-h-0">
          <EditorList
            groupedPosts={groupedPosts}
            selectedPost={selectedPost}
            onPostSelect={postOperations.handlePostSelect}
          />
          <MainContent
            selectedPost={selectedPost}
            metaData={metaData}
            onMetaChange={handleMetaChangeWithStatus}
            onTitleUpdate={postOperations.handleTitleUpdate(setGroupedPosts)}
            isLoadingPost={!selectedPost && totalPosts > 0}
          />
          <EditorSettings
            selectedPost={selectedPost}
            metaData={metaData}
            onMetaChange={handleMetaChangeWithStatus}
            onPostDelete={postOperations.handlePostDelete(setGroupedPosts)}
            sharedData={sharedData}
            dataLoading={dataLoading}
            activeTab={settingsTab}
            onTabChange={setSettingsTab}
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
        onOpenPartial={postOperations.handleOpenPartial}
      />
    </>
  );
};

export default EditorPage;
