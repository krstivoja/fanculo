import { useCallback } from "react";
import centralizedApi from "../utils/api/CentralizedApiService";
import { apiClient } from "../utils";
import { compileScss } from "../utils/scssCompiler";

const parsePartialSelection = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('⚠️ [useHotReload] Failed to parse partial selection string:', error);
      return [];
    }
  }

  return [];
};

const normalizeSelectedPartials = (selectionValue, allPartials) => {
  const selected = parsePartialSelection(selectionValue);
  if (!Array.isArray(selected) || selected.length === 0) {
    return [];
  }

  const lookup = {};
  allPartials.forEach((partial) => {
    lookup[partial.id] = partial;
  });

  const normalized = [];

  selected.forEach((entry, index) => {
    let resolvedId = null;
    let resolvedOrder = index + 1;

    if (typeof entry === 'object' && entry !== null) {
      const candidateId = entry.id ?? entry.partialId ?? entry.value;
      if (candidateId !== undefined && candidateId !== null) {
        resolvedId = Number(candidateId);
      }

      if (entry.order !== undefined && entry.order !== null) {
        resolvedOrder = entry.order;
      }
    } else if (typeof entry === 'number') {
      resolvedId = entry;
    } else if (typeof entry === 'string') {
      const numericId = parseInt(entry, 10);
      if (!Number.isNaN(numericId)) {
        resolvedId = numericId;
      }
    }

    if (resolvedId === null || Number.isNaN(resolvedId)) {
      return;
    }

    normalized.push({
      id: resolvedId,
      title: lookup[resolvedId]?.title ?? `Partial ${resolvedId}`,
      slug: lookup[resolvedId]?.slug ?? `partial-${resolvedId}`,
      order: resolvedOrder,
    });
  });

  return normalized;
};

const normalizePartialCollection = (collection) => {
  if (!collection) {
    return [];
  }

  if (Array.isArray(collection)) {
    return collection;
  }

  if (typeof collection === 'object') {
    return Object.values(collection).reduce((accumulator, value) => {
      return accumulator.concat(normalizePartialCollection(value));
    }, []);
  }

  return [];
};

const extractScssPartialsPayload = (related = {}) => {
  if (!related.scss_partials) {
    return { globalPartials: [], availablePartials: [] };
  }

  // The API response is wrapped: { success, data: { global_partials, available_partials }, meta }
  // So we need to access .data first, then the partials
  const responseData = related.scss_partials?.data || related.scss_partials;

  return {
    globalPartials: normalizePartialCollection(
      responseData?.globalPartials ||
      responseData?.global_partials ||
      []
    ),
    availablePartials: normalizePartialCollection(
      responseData?.availablePartials ||
      responseData?.available_partials ||
      []
    ),
  };
};

/**
 * Simple Hot Reload Save Hook
 *
 * Wraps save functions to automatically trigger hot reload
 */

export const useHotReloadSave = (postId, originalSaveFunction, postType) => {
  const saveWithHotReload = useCallback(
    async (...args) => {
      console.log('🔥 Hot reload save triggered for post:', postId);
      console.log('🔍 [useHotReload] Post type:', postType);

      // Call original save function
      const result = await originalSaveFunction(...args);
      console.log('💾 Save result:', result);

      const hotReloadPayload =
        result && typeof result === 'object' ? result.hotReloadPayload : null;
      const saveSucceeded = result !== false;

      // Trigger hot reload after successful save
      if (
        saveSucceeded &&
        window.fanculoSimpleHotReload &&
        postId &&
        postType !== 'scss-partials'
      ) {
        console.log('🚀 Triggering hot reload...');
        await window.fanculoSimpleHotReload.onStudioSave(
          postId,
          null,
          hotReloadPayload || undefined
        );
        console.log('✅ Hot reload triggered successfully');
      } else {
        console.log('❌ Hot reload not triggered. Result:', result, 'HotReload available:', !!window.fanculoSimpleHotReload);
      }

      // If this is an SCSS partial save, recompile all blocks using this partial
      if (postType === 'scss-partials' && saveSucceeded) {
        console.log('🔄 [useHotReload] SCSS partial saved - finding affected blocks...');

        // First, get the saved partial content to verify it was saved
        try {
          centralizedApi.invalidatePostCaches(postId);
          centralizedApi.invalidateScssPartialCaches();

          const partialData = await centralizedApi.getPostWithRelated(postId);
          console.log('🔍 [useHotReload] Partial data structure:', partialData);
          const partialContent = partialData.post?.meta?.scssPartials?.scss ||
                                 partialData.post?.meta?.scss_partials?.scss ||
                                 partialData.post?.meta?.blocks?.scss;
          console.log(`📝 [useHotReload] SCSS Partial ${postId} content:`, partialContent);
        } catch (e) {
          console.error('Failed to fetch partial content:', e);
        }

        try {
          // Get blocks that use this partial
          const response = await apiClient.request(`/scss-partial/${postId}/usage`);
          const affectedBlocks = response?.data?.blocks || [];

          if (affectedBlocks.length > 0) {
            console.log(`📦 [useHotReload] Found ${affectedBlocks.length} blocks using this partial:`, affectedBlocks);

            const regenerationOperations = [];
            const blockTasks = affectedBlocks.map((blockId) => (async () => {
              console.log(`⚙️ [useHotReload] Compiling block ${blockId}...`);

              try {
                centralizedApi.invalidatePostCaches(blockId);
                const blockData = await centralizedApi.getPostWithRelated(blockId);
                console.log(`🔍 [useHotReload] Block ${blockId} data structure:`, blockData);

                const block = blockData.post;
                const blockMeta = block.meta?.blocks || {};
                const blockSymbolsMeta = block.meta?.symbols || {};

                const { globalPartials, availablePartials } = extractScssPartialsPayload(blockData.related);
                const allPartials = [...globalPartials, ...availablePartials];

                const selectedPartials = normalizeSelectedPartials(
                  blockMeta.selected_partials ?? blockMeta.selectedPartials,
                  allPartials
                );
                const editorSelectedPartials = normalizeSelectedPartials(
                  blockMeta.editor_selected_partials ?? blockMeta.editorSelectedPartials,
                  allPartials
                );

                let compiledCss = null;
                let compiledEditorCss = null;

                if (blockMeta.scss) {
                  const scssCode = blockMeta.scss;
                  compiledCss = await compileScss(scssCode, blockId, {
                    globalPartials,
                    selectedPartials,
                  });

                  await centralizedApi.saveScssContent(blockId, {
                    scss_content: scssCode,
                    css_content: compiledCss,
                  });
                  console.log(`✅ [useHotReload] Compiled and saved style.css for block ${blockId}`);
                }

                if (blockMeta.editorScss) {
                  const editorScssCode = blockMeta.editorScss;
                  compiledEditorCss = await compileScss(editorScssCode, blockId, {
                    globalPartials,
                    selectedPartials: editorSelectedPartials,
                  });

                  await centralizedApi.saveEditorScssContent(blockId, {
                    editor_scss_content: editorScssCode,
                    editor_css_content: compiledEditorCss,
                  });
                  console.log(`✅ [useHotReload] Compiled and saved editor.css for block ${blockId}`);
                }

                regenerationOperations.push({
                  type: 'regenerate_files',
                  data: { post_id: blockId },
                });

                if (window.fanculoSimpleHotReload) {
                  const changeSet = [];
                  if (compiledCss !== null) {
                    changeSet.push('css');
                  }
                  if (compiledEditorCss !== null) {
                    changeSet.push('editorCss');
                  }

                  const payload = {
                    blockSlug: block.slug,
                    blockName: block.title?.rendered || block.title || `Block ${blockId}`,
                    content: {
                      css:
                        compiledCss ??
                        blockMeta.cssContent ??
                        blockMeta.scss ??
                        '',
                      editorCss:
                        compiledEditorCss ??
                        blockMeta.editorCssContent ??
                        blockMeta.editorScss ??
                        '',
                      php:
                        blockMeta.php ??
                        blockSymbolsMeta.php ??
                        '',
                      js: blockMeta.js ?? '',
                    },
                    changes: changeSet,
                  };

                  if (changeSet.length > 0) {
                    console.log(`🔥 [useHotReload] Triggering hot reload for affected block ${blockId}`);
                    await window.fanculoSimpleHotReload.onStudioSave(
                      blockId,
                      changeSet,
                      payload
                    );
                    console.log(`✅ [useHotReload] Hot reload triggered for block ${blockId}`);
                  }
                }
              } catch (compileError) {
                console.error(`❌ [useHotReload] Failed to compile block ${blockId}:`, compileError);
                throw compileError;
              }
            })());

            const results = await Promise.allSettled(blockTasks);
            const failedBlocks = results.filter((item) => item.status === 'rejected').length;

            if (failedBlocks === 0) {
              console.log('✅ [useHotReload] All affected blocks recompiled');
            } else {
              console.warn(`⚠️ [useHotReload] ${failedBlocks} block recompilations failed`);
            }

            if (regenerationOperations.length > 0) {
              console.log('🔁 [useHotReload] Regenerating files for affected blocks');
              await apiClient.request('/operations/bulk', {
                method: 'POST',
                body: JSON.stringify({ operations: regenerationOperations }),
              });
              console.log('✅ [useHotReload] File regeneration triggered for affected blocks');
            }
          } else {
            console.log('ℹ️ [useHotReload] No blocks use this partial');
          }
        } catch (error) {
          console.error('❌ [useHotReload] Failed to recompile affected blocks:', error);
        }
      }

      return result;
    },
    [originalSaveFunction, postId, postType]
  );

  return { saveWithHotReload };
};
