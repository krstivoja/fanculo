import React, { useState, useEffect } from 'react';
import { Textarea, Select, DashiconButton, Button } from '../ui';
import { TrashIcon } from '../icons';
import ScssPartialsCombined from './ScssPartialsCombined';
import InnerBlocksSettings from './InnerBlocksSettings';
import ScssPartialSettings from './ScssPartialSettings';
import { apiClient } from '../../../utils';
import { useEditor } from '../../hooks';

const EditorSettings = ({ onSave, saveStatus }) => {
  const { selectedPost, metaData, updateMeta, deletePost } = useEditor();
  const onMetaChange = updateMeta;
  const onPostDelete = deletePost;
  const [blockCategories, setBlockCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  // Parse settings from metaData
  const getSettings = () => {
    try {
      const settingsString = metaData?.blocks?.settings || '{}';
      return JSON.parse(settingsString);
    } catch (e) {
      return {};
    }
  };

  const settings = getSettings();
  const [description, setDescription] = useState(settings.description || '');
  const [category, setCategory] = useState(settings.category || '');
  const [icon, setIcon] = useState(settings.icon || 'search');

  // Fetch block categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const categories = await apiClient.getBlockCategories();
        console.log('Categories response:', categories);
        setBlockCategories(Array.isArray(categories) ? categories : []);
      } catch (error) {
        console.error('Error fetching block categories:', error);
        setBlockCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Update local state when selectedPost or metaData changes
  useEffect(() => {
    const currentSettings = getSettings();
    setDescription(currentSettings.description || '');
    setCategory(currentSettings.category || '');
    setIcon(currentSettings.icon || 'search');
  }, [selectedPost, metaData]);

  // Update settings in metaData when local state changes
  const updateSettings = (newDescription, newCategory, newIcon) => {
    const currentSettings = getSettings();
    const updatedSettings = {
      ...currentSettings,
      description: newDescription,
      category: newCategory,
      icon: newIcon
    };

    if (onMetaChange) {
      onMetaChange('blocks', 'settings', JSON.stringify(updatedSettings));
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
      await apiClient.deletePost(selectedPost.id);
      if (onPostDelete) {
        onPostDelete(selectedPost.id);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedPost) {
    return null;
  }

  // Check post type
  const isBlockType = selectedPost.terms && selectedPost.terms.some(term => term.slug === 'blocks');
  const isScssPartial = selectedPost.terms && selectedPost.terms.some(term => term.slug === 'scss-partials');

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
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </Button>
            <Button
              variant={activeTab === 'partials' ? 'primary' : 'ghost'}
              className="grow px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              onClick={() => setActiveTab('partials')}
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
                <div><strong>ID:</strong> {selectedPost.id}</div>
                <div><strong>Type:</strong> {selectedPost.terms?.[0]?.name || 'N/A'}</div>
                <div><strong>Slug:</strong> {selectedPost.slug || 'N/A'}</div>
              </div>

              {/* SCSS Partial Settings */}
              {isScssPartial && (
                <ScssPartialSettings />
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
                    <InnerBlocksSettings />
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
            <ScssPartialsCombined />
          </div>
        )}
      </div>
    </aside>
  );
};

export default EditorSettings;