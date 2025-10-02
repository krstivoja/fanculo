import React, { useState, useEffect, useMemo } from "react";
import EditorList from "./components/editor/EditorList";
import EditorHeader from "./components/editor/EditorHeader";
import EditorMain from "./components/editor/EditorMain";
import EditorSettings from "./components/editor/EditorSettings";
import EditorNoPosts from "./components/editor/EditorNoPosts";
import { Toast } from "./components/ui";
import { errorHandler } from "../utils";
import centralizedApi from "../utils/api/CentralizedApiService";
import {
  useMetadata,
  hasListVisibleChanges,
  useScssCompilation,
  useAppData,
  usePostOperations,
  useHotReloadSave,
} from "./hooks";
import "./style.css";

const App = () => {
  // UI state
  const [selectedPost, setSelectedPost] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [scssError, setScssError] = useState(null);
  const [showToast, setShowToast] = useState(false);

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
  } = useAppData(selectedPost, postOperations.handlePostSelect);

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
      if (selectedPost?.id) {
        // Compile SCSS (both frontend and editor) if needed
        await compileAllScss();

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

        // Don't refetch after save - optimistic update keeps UI in sync
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
            onPostSelect={postOperations.handlePostSelect}
            onPostsRefresh={refreshData}
          />
          <EditorMain
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

export default App;
