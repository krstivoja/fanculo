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

  const payload = related.scss_partials?.data || related.scss_partials;

  return {
    globalPartials: normalizePartialCollection(
      payload?.globalPartials || payload?.global_partials
    ),
    availablePartials: normalizePartialCollection(
      payload?.availablePartials || payload?.available_partials
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

      // Trigger hot reload after successful save
      if (result !== false && window.fanculoSimpleHotReload) {
        console.log('🚀 Triggering hot reload...');
        // Pass null to auto-detect changes
        await window.fanculoSimpleHotReload.onStudioSave(postId, null);
        console.log('✅ Hot reload triggered successfully');
      } else {
        console.log('❌ Hot reload not triggered. Result:', result, 'HotReload available:', !!window.fanculoSimpleHotReload);
      }

      // If this is an SCSS partial save, recompile all blocks using this partial
      if (postType === 'scss-partials' && result !== false) {
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

            // Compile each affected block
            for (const blockId of affectedBlocks) {
              console.log(`⚙️ [useHotReload] Compiling block ${blockId}...`);

              try {
                centralizedApi.invalidatePostCaches(blockId);
                const blockData = await centralizedApi.getPostWithRelated(blockId);
                console.log(`🔍 [useHotReload] Block ${blockId} data structure:`, blockData);

                const block = blockData.post;

                // Log the full related structure to see what's actually there
                console.log(`🔍 [useHotReload] Block ${blockId} related structure:`, blockData.related);

                const { globalPartials, availablePartials } = extractScssPartialsPayload(blockData.related);
                const allPartials = [...globalPartials, ...availablePartials];

                const blockMeta = block.meta?.blocks || {};
                const selectedPartials = normalizeSelectedPartials(
                  blockMeta.selected_partials ?? blockMeta.selectedPartials,
                  allPartials
                );
                const editorSelectedPartials = normalizeSelectedPartials(
                  blockMeta.editor_selected_partials ?? blockMeta.editorSelectedPartials,
                  allPartials
                );

                console.log(`📋 [useHotReload] Block ${blockId} global partial count: ${globalPartials.length}`);
                console.log(`📋 [useHotReload] Block ${blockId} available partial count: ${availablePartials.length}`);
                console.log(`📋 [useHotReload] Block ${blockId} selected partial count: ${selectedPartials.length}`);
                console.log(`📋 [useHotReload] Block ${blockId} editor selected partial count: ${editorSelectedPartials.length}`);

                if (selectedPartials.length > 0) {
                  console.log(`📋 [useHotReload] Block ${blockId} selected partials detail:`, selectedPartials);
                }

                // Compile style.css if block has SCSS
                if (block.meta?.blocks?.scss) {
                  const scssCode = block.meta.blocks.scss;
                  console.log(`📝 [useHotReload] Block ${blockId} SCSS:`, scssCode);

                  const compiledCss = await compileScss(scssCode, blockId, {
                    globalPartials,
                    selectedPartials,
                  });
                  console.log(`🎨 [useHotReload] Block ${blockId} compiled style.css:`, compiledCss);

                  await centralizedApi.saveScssContent(blockId, {
                    scss_content: scssCode,
                    css_content: compiledCss,
                  });

                  console.log(`✅ [useHotReload] Compiled and saved style.css for block ${blockId}`);
                }

                // Compile editor.css if block has editor SCSS
                if (block.meta?.blocks?.editorScss) {
                  const editorScssCode = block.meta.blocks.editorScss;
                  console.log(`📝 [useHotReload] Block ${blockId} editor SCSS:`, editorScssCode);

                  const compiledEditorCss = await compileScss(editorScssCode, blockId, {
                    globalPartials,
                    selectedPartials: editorSelectedPartials,
                  });
                  console.log(`🎨 [useHotReload] Block ${blockId} compiled editor.css:`, compiledEditorCss);

                  await centralizedApi.saveEditorScssContent(blockId, {
                    editor_scss_content: editorScssCode,
                    editor_css_content: compiledEditorCss,
                  });

                  console.log(`✅ [useHotReload] Compiled and saved editor.css for block ${blockId}`);
                }

                // Always trigger file regeneration so physical CSS files stay in sync
                console.log(`🔁 [useHotReload] Regenerating files for block ${blockId}`);
                await apiClient.request('/operations/bulk', {
                  method: 'POST',
                  body: JSON.stringify({
                    operations: [
                      {
                        type: 'regenerate_files',
                        data: { post_id: blockId },
                      },
                    ],
                  }),
                });
                console.log(`✅ [useHotReload] File regeneration triggered for block ${blockId}`);
              } catch (compileError) {
                console.error(`❌ [useHotReload] Failed to compile block ${blockId}:`, compileError);
              }
            }

            console.log('✅ [useHotReload] All affected blocks recompiled');
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
