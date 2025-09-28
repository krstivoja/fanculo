import { useCallback } from "react";

/**
 * Simple Hot Reload Save Hook
 * 
 * Wraps save functions to automatically trigger hot reload
 */

export const useHotReloadSave = (postId, originalSaveFunction) => {
  const saveWithHotReload = useCallback(
    async (...args) => {
      // Call original save function
      const result = await originalSaveFunction(...args);

      // Trigger hot reload after successful save
      if (result !== false && window.fanculoSimpleHotReload) {
        await window.fanculoSimpleHotReload.onStudioSave(postId, ["all"]);
      }

      return result;
    },
    [originalSaveFunction, postId]
  );

  return { saveWithHotReload };
};

