import React from 'react';
import { WithContext as ReactTagsComponent } from 'react-tag-input';

const KeyCodes = {
  comma: 188,
  enter: 13
};

const defaultDelimiters = [KeyCodes.comma, KeyCodes.enter];

const ReactTags = ({
  tags = [],
  suggestions = [],
  delimiters = defaultDelimiters,
  handleDelete,
  handleAddition,
  handleDrag,
  handleTagClick,
  inputFieldPosition = "bottom",
  autocomplete = true,
  editable = true,
  clearInputOnDelete = true,
  minQueryLength = 1,
  placeholder = "Type and press Enter...",
  maxTags,
  variant = "default",
  ...props
}) => {
  // Prevent adding tags if maxTags limit is reached
  const handleAdditionWithLimit = (tag) => {
    if (maxTags && tags.length >= maxTags) {
      return;
    }
    if (handleAddition) {
      handleAddition(tag);
    }
  };

  // Style variants
  const getVariantStyles = () => {
    switch (variant) {
      case "template":
        return {
          tag: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors',
          remove: 'ml-1 inline-flex items-center justify-center w-3 h-3 text-blue-600 hover:text-blue-800 cursor-pointer transition-colors before:content-["×"] before:text-xs before:leading-none'
        };
      case "default":
      default:
        return {
          tag: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-action/10 text-action border border-action/20 hover:bg-action/20 transition-colors',
          remove: 'ml-1 inline-flex items-center justify-center w-3 h-3 text-action/60 hover:text-action cursor-pointer transition-colors before:content-["×"] before:text-xs before:leading-none'
        };
    }
  };

  const variantStyles = getVariantStyles();

  const defaultClassNames = {
    tags: 'border border-outline rounded-md bg-base p-2 focus-within:ring-2 focus-within:ring-action/20 focus-within:border-action transition-colors',
    tagInput: 'relative',
    tagInputField: 'w-full px-3 py-2 text-sm border border-outline rounded-md bg-base text-highlight placeholder-contrast focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action transition-colors',
    selected: 'flex flex-wrap gap-2 mb-2 min-h-[20px]',
    tag: variantStyles.tag,
    remove: variantStyles.remove,
    suggestions: 'absolute top-full left-0 right-0 z-50 bg-base border border-outline border-t-0 rounded-b-md max-h-48 overflow-y-auto shadow-lg',
    suggestionsList: 'list-none m-0 p-0',
    suggestion: 'px-3 py-2 text-sm text-highlight cursor-pointer border-b border-outline last:border-b-0 hover:bg-base-2 transition-colors',
    suggestionActive: 'bg-base-2',
    suggestionHighlighted: 'bg-action/10'
  };

  // Merge custom classNames with defaults
  const classNames = {
    ...defaultClassNames,
    ...props.classNames
  };

  // Hide input when maxTags limit is reached
  const showInput = !maxTags || tags.length < maxTags;

  // Modify classNames to hide input field when limit reached
  const modifiedClassNames = {
    ...classNames,
    tagInputField: showInput
      ? classNames.tagInputField
      : `${classNames.tagInputField} hidden`,
    tagInput: showInput
      ? classNames.tagInput
      : `${classNames.tagInput} hidden`
  };

  return (
    <div className="space-y-2">
      <ReactTagsComponent
        tags={tags}
        suggestions={suggestions}
        delimiters={delimiters}
        handleDelete={handleDelete}
        handleAddition={handleAdditionWithLimit}
        handleDrag={handleDrag}
        handleTagClick={handleTagClick}
        inputFieldPosition={inputFieldPosition}
        autocomplete={autocomplete}
        editable={editable}
        clearInputOnDelete={clearInputOnDelete}
        minQueryLength={minQueryLength}
        placeholder={placeholder}
        classNames={modifiedClassNames}
        {...props}
      />

      {/* Show tag count and limit info */}
      {(maxTags || tags.length > 0) && (
        <div className="text-xs text-contrast">
          {tags.length} tag{tags.length !== 1 ? 's' : ''}
          {maxTags && ` (max ${maxTags})`}
          {maxTags && tags.length >= maxTags && !showInput && (
            <span className="text-yellow-600 ml-1">• Limit reached</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ReactTags;