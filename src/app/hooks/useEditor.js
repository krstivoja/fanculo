import { useContext, useCallback } from 'react';
import EditorContext from '../contexts/EditorContext';

/**
 * Hook for consuming Editor Context
 * Provides convenient methods and ensures context is available
 */
export const useEditor = () => {
  const context = useContext(EditorContext);

  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }

  // Add convenience methods for specific post types
  const updateBlockMeta = useCallback((field, value) => {
    context.updateMeta('blocks', field, value);
  }, [context]);

  const updateSymbolMeta = useCallback((field, value) => {
    context.updateMeta('symbols', field, value);
  }, [context]);

  const updateScssPartialMeta = useCallback((field, value) => {
    context.updateMeta('scss_partials', field, value);
  }, [context]);

  // Get metadata for specific sections
  const getBlockMeta = useCallback(() => {
    return context.metaData?.blocks || {};
  }, [context.metaData]);

  const getSymbolMeta = useCallback(() => {
    return context.metaData?.symbols || {};
  }, [context.metaData]);

  const getScssPartialMeta = useCallback(() => {
    return context.metaData?.scss_partials || {};
  }, [context.metaData]);

  // Check post type
  const isBlockPost = useCallback(() => {
    return context.selectedPost?.terms?.[0]?.slug === 'blocks';
  }, [context.selectedPost]);

  const isSymbolPost = useCallback(() => {
    return context.selectedPost?.terms?.[0]?.slug === 'symbols';
  }, [context.selectedPost]);

  const isScssPartialPost = useCallback(() => {
    return context.selectedPost?.terms?.[0]?.slug === 'scss-partials';
  }, [context.selectedPost]);

  const getPostType = useCallback(() => {
    return context.selectedPost?.terms?.[0]?.slug || null;
  }, [context.selectedPost]);

  // Toast management
  const showError = useCallback((message) => {
    context.setScssError(message);
    context.setShowToast(true);
  }, [context]);

  const hideToast = useCallback(() => {
    context.setShowToast(false);
    context.setScssError(null);
  }, [context]);

  return {
    // All context values
    ...context,

    // Convenience methods
    updateBlockMeta,
    updateSymbolMeta,
    updateScssPartialMeta,
    getBlockMeta,
    getSymbolMeta,
    getScssPartialMeta,
    isBlockPost,
    isSymbolPost,
    isScssPartialPost,
    getPostType,
    showError,
    hideToast
  };
};

export default useEditor;