import React, { useState, useEffect, Suspense, lazy } from "react";
import { Button, Toast, SaveButton, AdminButton, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "../ui";
import { apiClient } from "../../../utils";
import centralizedApi from "../../../utils/api/CentralizedApiService";

// Lazy load AddPostModal - only loads when needed
const AddPostModal = lazy(() => import("./AddPostModal"));

const Header = ({ onSave, saveStatus, hasUnsavedChanges, onPostsRefresh }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "info",
  });

  // Handle Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        onSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onSave]);

  const handleCreatePost = async (postData) => {
    try {
      console.log("Creating post with data:", postData);

      const newPost = await centralizedApi.createPost({
        title: postData.title,
        status: "publish",
        taxonomy_term: postData.type,
      });

      console.log("Post created successfully:", newPost);

      // Refresh the posts list to show the new post
      if (onPostsRefresh) {
        onPostsRefresh();
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const handleRegenerateAll = async () => {
    if (
      !confirm(
        "⚠️ Regenerate all files? This will forcefully recreate all files and may take several seconds."
      )
    ) {
      return;
    }

    setIsRegenerating(true);
    setToast({
      show: true,
      message: "Starting full regeneration...",
      type: "info",
    });

    try {
      console.log("Force regenerating all files...");

      // Use centralized API client for force regeneration
      const result = await centralizedApi.forceRegenerateAll();
      console.log("All files regenerated successfully:", result);
      setToast({
        show: true,
        message: "✅ All files regenerated successfully!",
        type: "success",
      });

      // Refresh posts list in case files were updated
      if (onPostsRefresh) {
        onPostsRefresh();
      }
    } catch (error) {
      console.error("Failed to regenerate files:", error);
      setToast({
        show: true,
        message: `❌ Failed to regenerate files: ${error.message}`,
        type: "error",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: "", type: "info" });
  };
  return (
    <header
      id="editor-header"
      className="h-fit border-b border-solid border-outline flex items-center justify-between"
    >
      <AdminButton />
      <nav className="flex gap-4 items-center w-full flex items-center justify-between px-2">
        <div id="nav-left">
          <Button variant="secondary" onClick={() => setIsAddModalOpen(true)}>
            Add new
          </Button>
        </div>
        <div id="nav-right" className="flex gap-2 justify-end">
          <SaveButton saveStatus={saveStatus} onSave={onSave} />
          <DropdownMenu
            trigger={
              <Button variant="ghost" className="px-3">
                ⋮
              </Button>
            }
          >
            <DropdownMenuItem href="/wp-admin/edit.php?post_type=funculo">
              Editor
            </DropdownMenuItem>
            <DropdownMenuItem href="/wp-admin/admin.php?page=funculo-settings">
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem href="/wp-admin/admin.php?page=funculo-licence">
              Licence
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRegenerateAll}
              className={isRegenerating ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isRegenerating ? "Regenerating..." : "Regenerate All"}
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </nav>

      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddPostModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onCreate={handleCreatePost}
          />
        </Suspense>
      )}

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </header>
  );
};

export default Header;
