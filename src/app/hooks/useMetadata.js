import { useState, useCallback } from "react";

/**
 * Check if metadata changes affect the posts list display
 * Only block icon is shown in the list (title is handled separately)
 */
export const hasListVisibleChanges = (originalMeta = {}, newMeta = {}) => {
  // Extract icon from blocks.settings for comparison
  const getIcon = (meta) => {
    try {
      const settings = meta?.blocks?.settings;
      if (typeof settings === "string") {
        return JSON.parse(settings)?.icon;
      }
      return settings?.icon;
    } catch (e) {
      return null;
    }
  };

  const originalIcon = getIcon(originalMeta);
  const newIcon = getIcon(newMeta);

  // If icon changed, we need to invalidate the collection cache
  return originalIcon !== newIcon;
};

/**
 * Custom hook for managing metadata state and changes
 */
export const useMetadata = (setScssError, setShowToast) => {
  const [metaData, setMetaData] = useState({});

  /**
   * Handle meta field changes
   */
  const handleMetaChange = useCallback(
    (section, field, value) => {
      setMetaData((prev) => {
        const previousSection = prev[section] || {};
        const updatedSection = {
          ...previousSection,
          [field]: value,
        };

        if (section === "blocks") {
          if (field === "selected_partials") {
            updatedSection.selectedPartials = value;
          } else if (field === "selectedPartials") {
            updatedSection.selected_partials = value;
          }

          if (field === "editor_selected_partials") {
            updatedSection.editorSelectedPartials = value;
          } else if (field === "editorSelectedPartials") {
            updatedSection.editor_selected_partials = value;
          }
        }

        return {
          ...prev,
          [section]: updatedSection,
        };
      });

      // Clear SCSS error when user makes changes
      if (section === "blocks" && field === "scss") {
        setScssError(null);
        setShowToast(false);
      }
    },
    [setScssError, setShowToast]
  );

  return {
    metaData,
    setMetaData,
    handleMetaChange,
  };
};
