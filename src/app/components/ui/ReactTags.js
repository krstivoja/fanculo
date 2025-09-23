import React, { useCallback } from 'react';
import { ReactTags } from 'react-tag-autocomplete';

import './ReactTags.css';

const CustomReactTags = ({
  tags = [],
  suggestions = [],
  handleDelete,
  handleAddition,
  placeholder = "Type and press Enter...",
  maxTags,
  allowNew = true,
  allowResize = true,
  minQueryLength = 1,
  ...props
}) => {
  // Convert tags to the format expected by react-tag-autocomplete
  const formattedTags = tags.map((tag, index) => ({
    value: tag.id || tag.text || tag,
    label: tag.text || tag.name || tag,
  }));

  // Convert suggestions to the format expected by react-tag-autocomplete
  const formattedSuggestions = suggestions.map((suggestion, index) => ({
    value: suggestion.id || suggestion.text || suggestion,
    label: suggestion.text || suggestion.name || suggestion,
  }));

  // Handle tag selection/addition
  const onAdd = useCallback((newTag) => {
    if (maxTags && tags.length >= maxTags) {
      return;
    }
    if (handleAddition) {
      // Convert back to the original format
      const convertedTag = {
        id: newTag.value,
        text: newTag.label
      };
      handleAddition(convertedTag);
    }
  }, [handleAddition, maxTags, tags.length]);

  // Handle tag removal
  const onDelete = useCallback((tagIndex) => {
    if (handleDelete) {
      handleDelete(tagIndex);
    }
  }, [handleDelete]);

  // Check if we should disable adding new tags (but still allow removal)
  const isAddingDisabled = maxTags && tags.length >= maxTags;

  return (
    <div className="react-tags-container">
      <div className={`react-tags-wrapper ${isAddingDisabled ? 'max-reached' : ''}`}>
        <ReactTags
          selected={formattedTags}
          suggestions={formattedSuggestions}
          onAdd={onAdd}
          onDelete={onDelete}
          placeholderText={placeholder}
          allowNew={allowNew && !isAddingDisabled}
          allowResize={allowResize}
          minQueryLength={minQueryLength}
          isDisabled={false}
          noOptionsText={null}
          classNames={{
            root: 'react-tags',
            rootIsActive: 'is-active',
            rootIsDisabled: 'is-disabled',
            rootIsInvalid: 'is-invalid',
            label: 'react-tags__label',
            tagList: 'react-tags__list',
            tagListItem: 'react-tags__list-item',
            tag: 'react-tags__tag',
            tagName: 'react-tags__tag-name',
            comboBox: 'react-tags__combobox',
            input: 'react-tags__combobox-input',
            listBox: 'react-tags__listbox',
            option: 'react-tags__listbox-option',
            optionIsActive: 'is-active',
            highlight: 'react-tags__listbox-option-highlight'
          }}
          {...props}
        />
      </div>

      {/* Show tag count and limit info */}
      {/* {(maxTags || tags.length > 0) && (
        <div className="react-tags-info">
          {tags.length} tag{tags.length !== 1 ? 's' : ''}
          {maxTags && ` (max ${maxTags})`}
          {maxTags && tags.length >= maxTags && (
            <span className="react-tags-limit-reached">• Limit reached</span>
          )}
        </div>
      )} */}
    </div>
  );
};

export default CustomReactTags;