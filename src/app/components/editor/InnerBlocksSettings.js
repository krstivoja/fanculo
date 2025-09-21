import React, { useState, useEffect } from 'react';
import { WithContext as ReactTags } from 'react-tag-input';
import { Toggle } from '../ui';
import { apiClient } from '../../../utils';

const KeyCodes = {
  comma: 188,
  enter: 13
};

const delimiters = [KeyCodes.comma, KeyCodes.enter];

const InnerBlocksSettings = ({ selectedPost, metaData, onMetaChange }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [blockSuggestions, setBlockSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Parse inner blocks settings from metaData
  const getInnerBlocksSettings = () => {
    try {
      const settingsString = metaData?.blocks?.inner_blocks_settings || '{}';
      return JSON.parse(settingsString);
    } catch (e) {
      return {};
    }
  };

  // Load initial state from metadata
  useEffect(() => {
    const settings = getInnerBlocksSettings();
    setIsEnabled(settings.enabled || false);

    // Convert block names to tag format
    const blocks = settings.allowed_blocks || [];
    const tags = blocks.map((blockName, index) => ({
      id: `${index}`,
      text: blockName
    }));
    setSelectedBlocks(tags);
  }, [selectedPost, metaData]);

  // Fetch available blocks when component mounts or when enabled
  useEffect(() => {
    if (isEnabled) {
      fetchAvailableBlocks();
    }
  }, [isEnabled]);

  const fetchAvailableBlocks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getRegisteredBlocks();
      const blocks = response.blocks || [];

      setAvailableBlocks(blocks);

      // Create suggestions for the tag input
      const suggestions = blocks.map((block, index) => ({
        id: `suggestion-${index}`,
        text: block.name
      }));
      setBlockSuggestions(suggestions);

      console.log('📦 Loaded blocks for inner blocks selection:', blocks.length);
    } catch (error) {
      console.error('❌ Error fetching registered blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update settings in metaData
  const updateInnerBlocksSettings = (enabled, allowedBlocks) => {
    const settings = {
      enabled,
      allowed_blocks: allowedBlocks
    };

    if (onMetaChange) {
      onMetaChange('blocks', 'inner_blocks_settings', JSON.stringify(settings));
    }
  };

  const handleToggle = (event) => {
    const enabled = event.target.checked;
    setIsEnabled(enabled);

    // Convert current tags back to block names
    const blockNames = selectedBlocks.map(tag => tag.text);
    updateInnerBlocksSettings(enabled, blockNames);
  };

  const handleDelete = (tagIndex) => {
    const newSelectedBlocks = selectedBlocks.filter((_, index) => index !== tagIndex);
    setSelectedBlocks(newSelectedBlocks);

    const blockNames = newSelectedBlocks.map(tag => tag.text);
    updateInnerBlocksSettings(isEnabled, blockNames);
  };

  const handleAddition = (tag) => {
    // Prevent duplicates
    const exists = selectedBlocks.some(existing => existing.text === tag.text);
    if (exists) {
      return;
    }

    const newSelectedBlocks = [...selectedBlocks, tag];
    setSelectedBlocks(newSelectedBlocks);

    const blockNames = newSelectedBlocks.map(tag => tag.text);
    updateInnerBlocksSettings(isEnabled, blockNames);
  };

  const handleDrag = (tag, currPos, newPos) => {
    const newSelectedBlocks = [...selectedBlocks];
    newSelectedBlocks.splice(currPos, 1);
    newSelectedBlocks.splice(newPos, 0, tag);

    setSelectedBlocks(newSelectedBlocks);

    const blockNames = newSelectedBlocks.map(tag => tag.text);
    updateInnerBlocksSettings(isEnabled, blockNames);
  };

  const handleTagClick = (index) => {
    console.log('The tag at index ' + index + ' was clicked');
  };

  // Only show for block type posts
  const isBlockType = selectedPost?.terms?.some(term => term.slug === 'blocks');

  if (!isBlockType) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h4 className="font-medium text-highlight">Inner Blocks Settings</h4>

        {/* Toggle Switch */}
        <Toggle
          checked={isEnabled}
          onChange={handleToggle}
          label="Enable Inner Blocks"
        />

        {/* Description */}
        <p className="text-sm text-contrast">
          Allow this block to contain other blocks as children. When enabled, you can specify which block types are allowed.
        </p>
      </div>

      {/* Block Selection Interface */}
      {isEnabled && (
        <div className="space-y-3 p-4 border border-outline rounded-md bg-base-2">
          <div>
            <label className="block text-sm font-medium text-highlight mb-2">
              Allowed Block Types
            </label>
            <p className="text-xs text-contrast mb-3">
              Type block names to add them. Leave empty to allow all blocks.
            </p>
          </div>

          {loading ? (
            <div className="text-sm text-contrast">Loading available blocks...</div>
          ) : (
            <div className="space-y-2">
              <ReactTags
                tags={selectedBlocks}
                suggestions={blockSuggestions}
                delimiters={delimiters}
                handleDelete={handleDelete}
                handleAddition={handleAddition}
                handleDrag={handleDrag}
                handleTagClick={handleTagClick}
                inputFieldPosition="bottom"
                autocomplete
                editable
                clearInputOnDelete
                placeholder="Type a block name and press Enter..."
                classNames={{
                  tags: 'border border-outline rounded-md bg-base p-2 focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action transition-colors',
                  tagInput: 'relative',
                  tagInputField: 'w-full px-3 py-2 text-sm border border-outline rounded-md bg-base text-highlight placeholder-contrast focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action transition-colors',
                  selected: 'flex flex-wrap gap-2 mb-2 min-h-[20px]',
                  tag: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-action/10 text-action border border-action/20 hover:bg-action/20 transition-colors',
                  remove: 'ml-1 inline-flex items-center justify-center w-3 h-3 text-action/60 hover:text-action cursor-pointer transition-colors before:content-["×"] before:text-xs before:leading-none',
                  suggestions: 'absolute top-full left-0 right-0 z-50 bg-base border border-outline border-t-0 rounded-b-md max-h-48 overflow-y-auto shadow-lg',
                  suggestionsList: 'list-none m-0 p-0',
                  suggestion: 'px-3 py-2 text-sm text-highlight cursor-pointer border-b border-outline last:border-b-0 hover:bg-base-2 transition-colors',
                  suggestionActive: 'bg-base-2',
                  suggestionHighlighted: 'bg-action/10'
                }}
              />
            </div>
          )}

          {/* Selected Blocks Info */}
          {selectedBlocks.length > 0 && (
            <div className="text-xs text-contrast">
              {selectedBlocks.length} block type{selectedBlocks.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-contrast space-y-1">
            <div>• Use core WordPress blocks like: <code className="bg-gray-100 px-1 rounded">core/paragraph</code>, <code className="bg-gray-100 px-1 rounded">core/heading</code></div>
            <div>• Custom blocks from themes/plugins will also appear in suggestions</div>
            <div>• Drag and drop to reorder block priorities</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InnerBlocksSettings;