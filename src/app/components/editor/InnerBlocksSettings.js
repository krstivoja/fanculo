import React, { useState, useEffect } from 'react';
import { WithContext as ReactTags } from 'react-tag-input';
import { Toggle } from '../ui';
import { apiClient } from '../../../utils';

const KeyCodes = {
  comma: 188,
  enter: 13
};

const delimiters = [KeyCodes.comma, KeyCodes.enter];

// Default Template Manager Component
const DefaultTemplateManager = ({
  defaultTemplate,
  setDefaultTemplate,
  templateLock,
  updateTemplateSettings,
  availableBlocks,
  allowedBlocks
}) => {
  const [templateTags, setTemplateTags] = useState([]);
  const [templateSuggestions, setTemplateSuggestions] = useState([]);

  // Initialize template tags and suggestions
  useEffect(() => {
    // Convert template array to tags format
    const tags = defaultTemplate.map((block, index) => ({
      id: `template-${index}`,
      text: block[0] // First element is the block name
    }));
    setTemplateTags(tags);

    // Create suggestions from allowed blocks only
    if (allowedBlocks && allowedBlocks.length > 0) {
      const suggestions = allowedBlocks.map((blockName, index) => ({
        id: `template-suggestion-${index}`,
        text: blockName
      }));
      setTemplateSuggestions(suggestions);
    } else {
      // If no allowed blocks specified, show all available blocks
      if (availableBlocks.length > 0) {
        const suggestions = availableBlocks.map((block, index) => ({
          id: `template-suggestion-${index}`,
          text: block.name
        }));
        setTemplateSuggestions(suggestions);
      }
    }
  }, [defaultTemplate, availableBlocks, allowedBlocks]);

  const handleTemplateDelete = (tagIndex) => {
    const newTemplateTags = templateTags.filter((_, index) => index !== tagIndex);
    setTemplateTags(newTemplateTags);

    // Convert back to template format
    const newTemplate = newTemplateTags.map(tag => [tag.text]);
    setDefaultTemplate(newTemplate);
    updateTemplateSettings(newTemplate, templateLock);
  };

  const handleTemplateAddition = (tag) => {
    // Prevent duplicates
    const exists = templateTags.some(existing => existing.text === tag.text);
    if (exists) {
      return;
    }

    const newTemplateTags = [...templateTags, tag];
    setTemplateTags(newTemplateTags);

    // Convert back to template format
    const newTemplate = newTemplateTags.map(tag => [tag.text]);
    setDefaultTemplate(newTemplate);
    updateTemplateSettings(newTemplate, templateLock);
  };

  const handleTemplateDrag = (tag, currPos, newPos) => {
    const newTemplateTags = [...templateTags];
    newTemplateTags.splice(currPos, 1);
    newTemplateTags.splice(newPos, 0, tag);

    setTemplateTags(newTemplateTags);

    // Convert back to template format
    const newTemplate = newTemplateTags.map(tag => [tag.text]);
    setDefaultTemplate(newTemplate);
    updateTemplateSettings(newTemplate, templateLock);
  };

  return (
    <div className="space-y-4">
      {/* Template Blocks Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-highlight">
          Default Template Blocks
        </label>
        <p className="text-xs text-contrast mb-3">
          Add blocks that will be automatically inserted when this block is created. Drag to reorder.
        </p>

        <ReactTags
          tags={templateTags}
          suggestions={templateSuggestions}
          delimiters={delimiters}
          handleDelete={handleTemplateDelete}
          handleAddition={handleTemplateAddition}
          handleDrag={handleTemplateDrag}
          inputFieldPosition="bottom"
          autocomplete
          editable
          clearInputOnDelete
          minQueryLength={1}
          placeholder="Type a block name for template and press Enter..."
          classNames={{
            tags: 'border border-outline rounded-md bg-base p-2 focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action transition-colors',
            tagInput: 'relative',
            tagInputField: 'w-full px-3 py-2 text-sm border border-outline rounded-md bg-base text-highlight placeholder-contrast focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action transition-colors',
            selected: 'flex flex-wrap gap-2 mb-2 min-h-[20px]',
            tag: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors',
            remove: 'ml-1 inline-flex items-center justify-center w-3 h-3 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors before:content-["×"] before:text-xs before:leading-none',
            suggestions: 'absolute top-full left-0 right-0 z-50 bg-base border border-outline border-t-0 rounded-b-md max-h-48 overflow-y-auto shadow-lg',
            suggestionsList: 'list-none m-0 p-0',
            suggestion: 'px-3 py-2 text-sm text-highlight cursor-pointer border-b border-outline last:border-b-0 hover:bg-base-2 transition-colors',
            suggestionActive: 'bg-base-2',
            suggestionHighlighted: 'bg-action/10'
          }}
        />

        {/* Template Info */}
        {templateTags.length > 0 && (
          <div className="text-xs text-contrast">
            {templateTags.length} template block{templateTags.length !== 1 ? 's' : ''} configured
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-contrast space-y-1">
          <div>• Only blocks from "Allowed Block Types" can be added to template</div>
          <div>• Template blocks are inserted in order when the block is created</div>
          <div>• Use drag and drop to reorder template blocks</div>
          <div>• Template lock prevents users from modifying the structure</div>
        </div>
      </div>
    </div>
  );
};

const InnerBlocksSettings = ({ selectedPost, metaData, onMetaChange }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [blockSuggestions, setBlockSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [defaultTemplate, setDefaultTemplate] = useState([]);
  const [templateLock, setTemplateLock] = useState(false);

  // Parse inner blocks settings from metaData
  const getInnerBlocksSettings = () => {
    try {
      const settingsString = metaData?.blocks?.inner_blocks_settings || '{}';
      return JSON.parse(settingsString);
    } catch (e) {
      return {};
    }
  };

  // Get template settings from main block settings
  const getBlockSettings = () => {
    try {
      const settingsString = metaData?.blocks?.settings || '{}';
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

    // Load template settings from main block settings
    const blockSettings = getBlockSettings();
    const innerBlocksConfig = blockSettings.innerBlocks || {};
    setDefaultTemplate(innerBlocksConfig.template || []);
    setTemplateLock(innerBlocksConfig.templateLock || false);
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

  // Update template settings in block settings
  const updateTemplateSettings = (template, templateLock) => {
    const currentBlockSettings = getBlockSettings();
    const updatedSettings = {
      ...currentBlockSettings,
      innerBlocks: {
        ...currentBlockSettings.innerBlocks,
        template,
        templateLock
      }
    };

    if (onMetaChange) {
      onMetaChange('blocks', 'settings', JSON.stringify(updatedSettings));
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

  const handleTemplateLockChange = (event) => {
    const locked = event.target.checked;
    setTemplateLock(locked);
    updateTemplateSettings(defaultTemplate, locked);
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
        <div className="space-y-5 p-4 border border-outline rounded-md bg-base-2">
          <div>
            <label className="block text-sm font-medium text-highlight mb-2">
              Allowed Block Types
            </label>           
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
                minQueryLength={1}
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

          <p className="text-xs text-contrast">
            Specify blocks for the inserter. Leave blank to allow all.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-highlight">
              Lock Template
            </label>
            <Toggle
              checked={templateLock}
              onChange={handleTemplateLockChange}
              label={templateLock ? 'True' : 'False'}
            />
            <p className="text-xs text-contrast">
              Prevent users from adding, removing, or moving blocks.
            </p>
          </div>

          <DefaultTemplateManager
            defaultTemplate={defaultTemplate}
            setDefaultTemplate={setDefaultTemplate}
            templateLock={templateLock}
            updateTemplateSettings={updateTemplateSettings}
            availableBlocks={availableBlocks}
            allowedBlocks={selectedBlocks.map(tag => tag.text)}
          />
        </div>
      )}

    </div>
  );
};

export default InnerBlocksSettings;
