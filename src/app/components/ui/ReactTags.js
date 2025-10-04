import React, { useCallback } from 'react';
import Select from 'react-select';

import './ReactTags.css';

const CustomReactTags = ({
  tags = [],
  suggestions = [],
  handleDelete,
  handleAddition,
  placeholder = "Select from existing...",
  maxTags,
  allowNew = false, // Changed default to false - no new tags allowed
  ...props
}) => {
  // Convert tags to the format expected by react-select
  const selectedValues = tags.map((tag) => ({
    value: tag.id || tag.text || tag,
    label: tag.text || tag.name || tag,
  }));

  // Convert suggestions to options for react-select
  const options = suggestions.map((suggestion) => ({
    value: suggestion.id || suggestion.text || suggestion,
    label: suggestion.text || suggestion.name || suggestion,
  }));

  // Handle selection change
  const onChange = useCallback((newValues) => {
    const currentValues = selectedValues;

    // Find added item
    const addedItem = newValues?.find(
      newVal => !currentValues.some(curr => curr.value === newVal.value)
    );

    // Find removed item
    const removedIndex = currentValues.findIndex(
      curr => !newValues?.some(newVal => newVal.value === curr.value)
    );

    if (addedItem && handleAddition) {
      // Check max tags limit
      if (maxTags && tags.length >= maxTags) {
        return;
      }
      // Convert to original format
      const convertedTag = {
        id: addedItem.value,
        text: addedItem.label
      };
      handleAddition(convertedTag);
    } else if (removedIndex !== -1 && handleDelete) {
      handleDelete(removedIndex);
    }
  }, [handleAddition, handleDelete, maxTags, tags.length, selectedValues]);

  // Check if we should disable adding new tags
  const isAddingDisabled = maxTags && tags.length >= maxTags;

  // Custom styles for react-select to match the theme
  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '40px',
      borderColor: state.isFocused ? 'var(--color-action)' : 'var(--color-outline)',
      boxShadow: state.isFocused ? '0 0 0 1px var(--color-action)' : 'none',
      '&:hover': {
        borderColor: 'var(--color-action)',
      },
      backgroundColor: 'var(--color-base)',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--color-base)',
      border: '1px solid var(--color-outline)',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'var(--color-base-2)' : 'var(--color-base)',
      color: 'var(--color-contrast)',
      '&:active': {
        backgroundColor: 'var(--color-base-2)',
      },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'var(--color-base-2)',
      border: '1px solid var(--color-outline)',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'var(--color-contrast)',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'var(--color-contrast)',
      '&:hover': {
        backgroundColor: 'var(--color-danger)',
        color: 'white',
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--color-contrast-muted)',
    }),
    input: (base) => ({
      ...base,
      color: 'var(--color-contrast)',
    }),
  };

  return (
    <div className="react-tags-container">
      <Select
        isMulti
        value={selectedValues}
        options={options}
        onChange={onChange}
        placeholder={placeholder}
        isDisabled={isAddingDisabled}
        styles={customStyles}
        classNamePrefix="react-select"
        noOptionsMessage={() => "No partials available"}
        {...props}
      />
    </div>
  );
};

export default CustomReactTags;