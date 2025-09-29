import { useCallback } from "react";

/**
 * Simple Hot Reload Save Hook
 * 
 * Wraps save functions to automatically trigger hot reload
 */

export const useHotReloadSave = (postId, originalSaveFunction) => {
  const saveWithHotReload = useCallback(
    async (...args) => {
      console.log('🔥 Hot reload save triggered for post:', postId);

      // Call original save function
      const result = await originalSaveFunction(...args);
      console.log('💾 Save result:', result);

      // Trigger hot reload after successful save
      if (result !== false && window.fanculoSimpleHotReload) {
        console.log('🚀 Triggering hot reload...');
        await window.fanculoSimpleHotReload.onStudioSave(postId, ["all"]);
        console.log('✅ Hot reload triggered successfully');
      } else {
        console.log('❌ Hot reload not triggered. Result:', result, 'HotReload available:', !!window.fanculoSimpleHotReload);
      }

      return result;
    },
    [originalSaveFunction, postId]
  );

  return { saveWithHotReload };
};

