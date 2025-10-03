import React, { useState, useEffect } from "react";
import { Textarea, Select, DashiconButton, Button } from "../ui";
import { TrashIcon } from "../icons";
import ScssPartialsCombined from "./ScssPartialsCombined";
import InnerBlocksSettings from "./InnerBlocksSettings";
import ScssPartialSettings from "./ScssPartialSettings";
import centralizedApi from "../../../utils/api/CentralizedApiService";

const EditorSettings = ({
  selectedPost,
  metaData,
  onMetaChange,
  onPostDelete,
  sharedData,
  dataLoading,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [icon, setIcon] = useState("search");

  const blockCategories = sharedData?.blockCategories || [];
  const loadingCategories = dataLoading?.blockCategories || false;

  useEffect(() => {
    try {
      const settingsString = metaData?.blocks?.settings || "{}";
      const settings = JSON.parse(settingsString);
      setDescription(settings.description || "");
      setCategory(settings.category || "");
      setIcon(settings.icon || "search");
    } catch (e) {
      setDescription("");
      setCategory("");
      setIcon("search");
    }
  }, [metaData?.blocks?.settings]);

  const updateSettings = (newDescription, newCategory, newIcon) => {
    const updatedSettings = {
      description: newDescription,
      category: newCategory,
      icon: newIcon,
    };

    if (onMetaChange) {
      onMetaChange("blocks", "settings", JSON.stringify(updatedSettings));
    }
  };

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    updateSettings(newDescription, category, icon);
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    updateSettings(description, newCategory, icon);
  };

  const handleIconChange = (newIcon) => {
    setIcon(newIcon);
    updateSettings(description, category, newIcon);
  };

  const handleDelete = async () => {
    if (!selectedPost) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${selectedPost.title}"? This will also delete associated files and cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await centralizedApi.deletePost(selectedPost.id);
      if (onPostDelete) {
        onPostDelete(selectedPost.id);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post: " + (error.message || "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedPost) {
    return null;
  }

  const isBlockType = selectedPost?.terms?.some((term) => term.slug === "blocks") || false;
  const isScssPartial = selectedPost?.terms?.some((term) => term.slug === "scss-partials") || false;
  const postInfo = {
    id: selectedPost?.id,
    type: selectedPost?.terms?.[0]?.name || "N/A",
    slug: selectedPost?.slug || "N/A",
  };

  return (
    <aside
      id="editor-settings"
      className="grow max-w-[var(--sidebar)] border-l border-solid border-outline flex flex-col"
    >
      {/* Tab Navigation for Blocks */}
      {isBlockType && (
        <div className="p-3">
          <div className="flex p-1 border border-solid border-outline rounded-md bg-base-2">
            <Button
              variant={activeTab === "settings" ? "primary" : "ghost"}
              className="grow px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </Button>
            <Button
              variant={activeTab === "partials" ? "primary" : "ghost"}
              className="grow px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              onClick={() => setActiveTab("partials")}
            >
              SCSS Partials
            </Button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Settings Tab */}
        {(!isBlockType || activeTab === "settings") && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="text-sm text-contrast space-y-2">
                <div>
                  <strong>ID:</strong> {postInfo.id}
                </div>
                <div>
                  <strong>Type:</strong> {postInfo.type}
                </div>
                <div>
                  <strong>Slug:</strong> {postInfo.slug}
                </div>
              </div>

              {/* SCSS Partial Settings */}
              {isScssPartial && (
                <ScssPartialSettings
                  selectedPost={selectedPost}
                  metaData={metaData}
                  onMetaChange={onMetaChange}
                />
              )}

              {isBlockType && (
                <div className="space-y-4 pt-4 border-t border-outline">
                  <h4 className="font-medium text-highlight">
                    Block Configuration
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-highlight mb-2">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={handleDescriptionChange}
                      placeholder="Enter block description..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-highlight mb-2">
                      Category
                    </label>
                    <Select
                      value={category}
                      onChange={handleCategoryChange}
                      options={blockCategories}
                      placeholder={
                        loadingCategories
                          ? "Loading categories..."
                          : "Select category"
                      }
                      disabled={loadingCategories}
                    />
                  </div>

                  <DashiconButton
                    selectedIcon={icon}
                    onIconSelect={handleIconChange}
                    label="Block Dashicon"
                  />

                  {/* Inner Blocks Settings */}
                  <div className="pt-4 border-t border-outline">
                    <InnerBlocksSettings
                      selectedPost={selectedPost}
                      metaData={metaData}
                      onMetaChange={onMetaChange}
                      sharedData={sharedData}
                      dataLoading={dataLoading}
                    />
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              <div className="pt-6 border-t border-outline space-y-4">
                <h4 className="font-medium text-highlight">Dangerous area</h4>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="secondary"
                  title="Delete permanently"
                  className="flex items-center gap-2"
                >
                  <TrashIcon className="w-5 h-5" />
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SCSS Partials Tab - Combined view */}
        {isBlockType && activeTab === "partials" && (
          <div className="flex-1 overflow-hidden">
            <ScssPartialsCombined
              selectedPost={selectedPost}
              metaData={metaData}
              onMetaChange={onMetaChange}
              sharedData={sharedData}
              dataLoading={dataLoading}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

export default EditorSettings;
