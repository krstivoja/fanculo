import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Textarea, Select, DashiconButton, Button } from '../ui';
import { TrashIcon } from '../icons';
import ScssPartialsCombined from './ScssPartialsCombined';
import InnerBlocksSettings from './InnerBlocksSettings';
import ScssPartialSettings from './ScssPartialSettings';
import { apiClient } from '../../../utils';
import centralizedApi from '../../../utils/api/CentralizedApiService';

const EditorSettings = ({ selectedPost, metaData, onMetaChange, onPostDelete, sharedData, dataLoading }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  // Memoize expensive settings parsing
  const settings = useMemo(() => {
    try {
      const settingsString = metaData?.blocks?.settings || '{}';
      return JSON.parse(settingsString);
    } catch (e) {
      return {};
    }
  }, [metaData?.blocks?.settings]);
  // Memoize expensive post type checks
  const postTypeInfo = useMemo(() => ({
    isBlockType: selectedPost?.terms?.some(term => term.slug === 'blocks') || false,
    isScssPartial: selectedPost?.terms?.some(term => term.slug === 'scss-partials') || false,
    postInfo: {
      id: selectedPost?.id,
      type: selectedPost?.terms?.[0]?.name || 'N/A',
      slug: selectedPost?.slug || 'N/A'
    }
  }), [selectedPost?.terms, selectedPost?.id, selectedPost?.slug]);

  const [description, setDescription] = useState(settings.description || '');
  const [category, setCategory] = useState(settings.category || '');
  const [icon, setIcon] = useState(settings.icon || 'search');

  // Get block categories from shared data (no API call needed)
  const blockCategories = sharedData?.blockCategories || [];
  const loadingCategories = dataLoading?.blockCategories || false;

  // Update local state when selectedPost or metaData changes
  useEffect(() => {
    setDescription(settings.description || '');
    setCategory(settings.category || '');
    setIcon(settings.icon || 'search');
  }, [settings]);

  // Memoize expensive settings update function
  const updateSettings = useCallback((newDescription, newCategory, newIcon) => {
    const updatedSettings = {
      ...settings,
      description: newDescription,
      category: newCategory,
      icon: newIcon
    };

    if (onMetaChange) {
      onMetaChange('blocks', 'settings', JSON.stringify(updatedSettings));
    }
  }, [settings, onMetaChange]);

  // Memoize event handlers
  const handleDescriptionChange = useCallback((e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    updateSettings(newDescription, category, icon);
  }, [updateSettings, category, icon]);

  const handleCategoryChange = useCallback((e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    updateSettings(description, newCategory, icon);
  }, [updateSettings, description, icon]);

  const handleIconChange = useCallback((newIcon) => {
    setIcon(newIcon);
    updateSettings(description, category, newIcon);
  }, [updateSettings, description, category]);

  // Memoize tab switching
  const handleTabClick = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedPost) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${selectedPost.title}"? This will also delete associated files and cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // First, attempt the actual deletion BEFORE optimistic update
      console.log('🗑️ Attempting to delete post:', selectedPost.id);
      const result = await centralizedApi.deletePost(selectedPost.id);
      console.log('✅ Delete result:', result);

      // Only update UI after successful deletion
      if (onPostDelete) {
        onPostDelete(selectedPost.id);
      }

    } catch (error) {
      console.error('❌ Error deleting post:', error);
      alert('Failed to delete post: ' + (error.message || 'Unknown error'));
      // Don't call onPostDelete if deletion failed
    } finally {
      setIsDeleting(false);
    }
  }, [selectedPost, onPostDelete]);

  if (!selectedPost) {
    return null;
  }

  const { isBlockType, isScssPartial, postInfo } = postTypeInfo;

  return (
    <aside id="editor-settings" className='grow max-w-[var(--sidebar)] border-l border-solid border-outline flex flex-col'>
      {/* Header */}
      {/* <div className="flex items-center justify-between border-b border-outline p-4">
        <h3 className="text-lg font-semibold">Settings</h3>
      </div> */}

      {/* Tab Navigation for Blocks */}
      {isBlockType && (
        <div className="p-3">
          <div className="flex p-1 border border-solid border-outline rounded-md bg-base-2">
            <Button
              variant={activeTab === 'settings' ? 'primary' : 'ghost'}
              className="grow px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              onClick={() => handleTabClick('settings')}
            >
              Settings
            </Button>
            <Button
              variant={activeTab === 'partials' ? 'primary' : 'ghost'}
              className="grow px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              onClick={() => handleTabClick('partials')}
            >
              SCSS Partials
            </Button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Settings Tab */}
        {(!isBlockType || activeTab === 'settings') && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="text-sm text-contrast space-y-2">
                <div><strong>ID:</strong> {postInfo.id}</div>
                <div><strong>Type:</strong> {postInfo.type}</div>
                <div><strong>Slug:</strong> {postInfo.slug}</div>
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
                  <h4 className="font-medium text-highlight">Block Configuration</h4>

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
                      placeholder={loadingCategories ? "Loading categories..." : "Select category"}
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
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SCSS Partials Tab - Combined view */}
        {isBlockType && activeTab === 'partials' && (
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

// Memoize the component to prevent unnecessary re-renders of expensive settings panels
export default React.memo(EditorSettings, (prevProps, nextProps) => {
  // Custom comparison function for expensive settings panels
  return (
    // Check if selectedPost is the same
    prevProps.selectedPost?.id === nextProps.selectedPost?.id &&
    prevProps.selectedPost?.title === nextProps.selectedPost?.title &&
    // Deep comparison of terms for post type determination
    JSON.stringify(prevProps.selectedPost?.terms) === JSON.stringify(nextProps.selectedPost?.terms) &&
    // Check if metaData reference is the same (most critical for preventing expensive re-renders)
    prevProps.metaData === nextProps.metaData &&
    // Check if metaData.blocks.settings specifically changed (the expensive part)
    prevProps.metaData?.blocks?.settings === nextProps.metaData?.blocks?.settings &&
    // Check if callback functions are the same reference
    prevProps.onMetaChange === nextProps.onMetaChange &&
    prevProps.onPostDelete === nextProps.onPostDelete
  );
});