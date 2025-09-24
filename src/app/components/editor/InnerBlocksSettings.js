import React, { useState, useEffect } from 'react';
import { Toggle, Hr, ReactTags } from '../ui';
import { apiClient } from '../../../utils';

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
        <Hr />
        <label className="block text-sm font-medium text-highlight">
          Block added by default
        </label>
        
        <ReactTags
          tags={templateTags}
          suggestions={templateSuggestions}
          handleDelete={handleTemplateDelete}
          handleAddition={handleTemplateAddition}
          handleDrag={handleTemplateDrag}
          placeholder="Type a block name for template and press Enter..."
        />

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

    } catch (error) {
      console.error('Error fetching registered blocks:', error);
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
           <label className="block text-sm font-medium text-highlight mb-2">
              Allowed Block Types
            </label>       

          {loading ? (
            <div className="text-sm text-contrast">Loading available blocks...</div>
          ) : (
            <ReactTags
            tags={selectedBlocks}
            suggestions={blockSuggestions}
            handleDelete={handleDelete}
            handleAddition={handleAddition}
            handleDrag={handleDrag}
            placeholder="Type a block name and press Enter..."
            />
          )}

          <p className="text-xs text-contrast !m-0">
            Leave blank to allow all.
          </p>

          <DefaultTemplateManager
            defaultTemplate={defaultTemplate}
            setDefaultTemplate={setDefaultTemplate}
            templateLock={templateLock}
            updateTemplateSettings={updateTemplateSettings}
            availableBlocks={availableBlocks}
            allowedBlocks={selectedBlocks.map(tag => tag.text)}
          />

          <div className="space-y-2">
            <Hr />
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


        </div>
      )}

    </div>
  );
};

export default InnerBlocksSettings;
