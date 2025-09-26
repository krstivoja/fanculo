import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useEditor } from './useEditor';

/**
 * Hook for selective metadata subscriptions
 * Optimizes re-renders by only subscribing to specific meta sections
 *
 * @param {string} section - The metadata section to subscribe to (e.g., 'blocks', 'symbols')
 * @param {Array<string>} fields - Optional array of specific fields to watch
 */
export const useMetaData = (section, fields = null) => {
  const { metaData, updateMeta, saveStatus, saveMetaData } = useEditor();

  // Debounce timer ref
  const saveTimerRef = useRef(null);

  // Get the specific section data
  const sectionData = useMemo(() => {
    if (!metaData || !section) return {};

    const data = metaData[section] || {};

    // If specific fields are requested, filter them
    if (fields && Array.isArray(fields)) {
      return fields.reduce((acc, field) => {
        acc[field] = data[field] || '';
        return acc;
      }, {});
    }

    return data;
  }, [metaData, section, fields]);

  /**
   * Update a field in this section with auto-save
   */
  const updateField = useCallback((field, value, autoSave = false) => {
    updateMeta(section, field, value);

    if (autoSave) {
      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set new timer for auto-save
      saveTimerRef.current = setTimeout(() => {
        saveMetaData();
      }, 2000); // 2 second debounce
    }
  }, [updateMeta, section, saveMetaData]);

  /**
   * Update multiple fields at once
   */
  const updateFields = useCallback((updates, autoSave = false) => {
    Object.entries(updates).forEach(([field, value]) => {
      updateMeta(section, field, value);
    });

    if (autoSave) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveMetaData();
      }, 2000);
    }
  }, [updateMeta, section, saveMetaData]);

  /**
   * Get a specific field value
   */
  const getField = useCallback((field) => {
    return sectionData[field] || '';
  }, [sectionData]);

  /**
   * Check if a field has a value
   */
  const hasField = useCallback((field) => {
    return Boolean(sectionData[field]);
  }, [sectionData]);

  /**
   * Reset a field to empty
   */
  const resetField = useCallback((field) => {
    updateMeta(section, field, '');
  }, [updateMeta, section]);

  /**
   * Reset all fields in the section
   */
  const resetSection = useCallback(() => {
    const emptyData = Object.keys(sectionData).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {});

    Object.entries(emptyData).forEach(([field, value]) => {
      updateMeta(section, field, value);
    });
  }, [sectionData, updateMeta, section]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Check if this section has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return saveStatus === 'unsaved';
  }, [saveStatus]);

  // Get field-specific validation
  const validateField = useCallback((field, value) => {
    // Add field-specific validation logic here
    switch (field) {
      case 'php':
        // Basic PHP validation
        if (value && !value.includes('<?php') && value.trim() !== '') {
          return 'PHP code should start with <?php';
        }
        break;
      case 'attributes':
        // JSON validation for attributes
        if (value) {
          try {
            JSON.parse(value);
          } catch (e) {
            return 'Invalid JSON format';
          }
        }
        break;
      default:
        break;
    }
    return null; // No error
  }, []);

  return {
    // Data
    data: sectionData,

    // Methods
    updateField,
    updateFields,
    getField,
    hasField,
    resetField,
    resetSection,
    validateField,

    // Status
    hasUnsavedChanges,

    // Direct access to commonly used fields
    ...sectionData
  };
};

/**
 * Hook specifically for block metadata
 */
export const useBlockMetaData = (fields = null) => {
  return useMetaData('blocks', fields);
};

/**
 * Hook specifically for symbol metadata
 */
export const useSymbolMetaData = (fields = null) => {
  return useMetaData('symbols', fields);
};

/**
 * Hook specifically for SCSS partial metadata
 */
export const useScssPartialMetaData = (fields = null) => {
  return useMetaData('scss_partials', fields);
};

export default useMetaData;