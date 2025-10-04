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

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn(
        "⚠️ [useHotReload] Failed to parse partial selection string:",
        error
      );
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

    if (typeof entry === "object" && entry !== null) {
      const candidateId = entry.id ?? entry.partialId ?? entry.value;
      if (candidateId !== undefined && candidateId !== null) {
        resolvedId = Number(candidateId);
      }

      if (entry.order !== undefined && entry.order !== null) {
        resolvedOrder = entry.order;
      }
    } else if (typeof entry === "number") {
      resolvedId = entry;
    } else if (typeof entry === "string") {
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

  if (typeof collection === "object") {
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
      responseData?.globalPartials || responseData?.global_partials || []
    ),
    availablePartials: normalizePartialCollection(
      responseData?.availablePartials || responseData?.available_partials || []
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
      // console.log("🔥 Hot reload save triggered for post:", postId);
      // console.log("🔍 [useHotReload] Post type:", postType);

      // Call original save function
      const result = await originalSaveFunction(...args);
      // console.log("💾 Save result:", result);

      const hotReloadPayload =
        result && typeof result === "object" ? result.hotReloadPayload : null;
      const saveSucceeded = result !== false;

      // Trigger hot reload after successful save (but not for SCSS partials - they trigger affected blocks instead)
      if (
        saveSucceeded &&
        window.fancooloSimpleHotReload &&
        postId &&
        postType !== "scss-partials"
      ) {
        console.log("🚀 Triggering hot reload...");
        await window.fancooloSimpleHotReload.onStudioSave(
          postId,
          null,
          hotReloadPayload || undefined
        );
        // console.log("✅ Hot reload triggered successfully");
      }

      // If this is an SCSS partial save, recompile all blocks using this partial
      if (postType === "scss-partials" && saveSucceeded) {
        // console.log(
        //   "🔄 [useHotReload] SCSS partial saved - finding affected blocks..."
        // );

        // First, get the saved partial content and check if it's global
        let isGlobalPartial = false;
        try {
          centralizedApi.invalidatePostCaches(postId);
          centralizedApi.invalidateScssPartialCaches();

          const partialData = await centralizedApi.getPostWithRelated(postId);

          // Check if this is a global partial
          const isGlobalFromMeta =
            partialData.post?.meta?.scss_partials?.is_global === "1" ||
            partialData.post?.meta?.scss_partials?.is_global === 1 ||
            partialData.post?.meta?.scss_partials?.is_global === true;
          const isGlobalFromRelated =
            partialData.related?.globalSettings?.isGlobal === true ||
            partialData.related?.globalSettings?.is_global === true ||
            partialData.related?.global_settings?.is_global === true;

          isGlobalPartial = isGlobalFromMeta || isGlobalFromRelated;
        } catch (e) {
          console.error("Failed to fetch partial content:", e);
        }

        try {
          let affectedBlocks = [];

          if (isGlobalPartial) {
            // Global partial affects ALL blocks - get all blocks
            const allBlocksResponse = await apiClient.request("/posts", {
              method: "GET",
            });

            // Filter to get only blocks (not symbols or partials)
            // Handle both response formats: {data: posts: [...]} or {data: [...]}
            const allPosts =
              allBlocksResponse?.data?.posts || allBlocksResponse?.data || [];

            affectedBlocks = allPosts
              .filter((post) => {
                const terms = post.terms || [];
                return terms.some((term) => term.slug === "blocks");
              })
              .map((post) => post.id);
          } else {
            // Regular partial - only get blocks that use it
            const response = await apiClient.request(
              `/scss-partial/${postId}/usage`
            );
            affectedBlocks = response?.data?.blocks || [];
          }

          if (affectedBlocks.length > 0) {
            const blockTypeLabel = isGlobalPartial
              ? "blocks (global partial)"
              : "blocks using this partial";
            // console.log(
            //   `📦 [useHotReload] Found ${affectedBlocks.length} ${blockTypeLabel}:`,
            //   affectedBlocks
            // );

            const regenerationOperations = [];
            const blockTasks = affectedBlocks.map((blockId) =>
              (async () => {
                // console.log(`⚙️ [useHotReload] Compiling block ${blockId}...`);

                try {
                  // Invalidate caches to ensure fresh data
                  centralizedApi.invalidatePostCaches(blockId);
                  centralizedApi.invalidateScssPartialCaches(); // Ensure fresh global partials

                  const blockData =
                    await centralizedApi.getPostWithRelated(blockId);

                  const block = blockData.post;
                  const blockMeta = block.meta?.blocks || {};
                  const blockSymbolsMeta = block.meta?.symbols || {};

                  const { globalPartials, availablePartials } =
                    extractScssPartialsPayload(blockData.related);
                  const allPartials = [...globalPartials, ...availablePartials];

                  const selectedPartials = normalizeSelectedPartials(
                    blockMeta.selected_partials ?? blockMeta.selectedPartials,
                    allPartials
                  );
                  const editorSelectedPartials = normalizeSelectedPartials(
                    blockMeta.editor_selected_partials ??
                      blockMeta.editorSelectedPartials,
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
                  }

                  if (blockMeta.editorScss) {
                    const editorScssCode = blockMeta.editorScss;
                    compiledEditorCss = await compileScss(
                      editorScssCode,
                      blockId,
                      {
                        globalPartials,
                        selectedPartials: editorSelectedPartials,
                      }
                    );

                    await centralizedApi.saveEditorScssContent(blockId, {
                      editor_scss_content: editorScssCode,
                      editor_css_content: compiledEditorCss,
                    });
                  }

                  regenerationOperations.push({
                    type: "regenerate_files",
                    data: { post_id: blockId },
                  });

                  if (window.fancooloSimpleHotReload) {
                    const changeSet = [];
                    if (compiledCss !== null) {
                      changeSet.push("css");
                    }
                    if (compiledEditorCss !== null) {
                      changeSet.push("editorCss");
                    }

                    const payload = {
                      blockSlug: block.slug,
                      blockName:
                        block.title?.rendered ||
                        block.title ||
                        `Block ${blockId}`,
                      content: {
                        css:
                          compiledCss ??
                          blockMeta.cssContent ??
                          blockMeta.scss ??
                          "",
                        editorCss:
                          compiledEditorCss ??
                          blockMeta.editorCssContent ??
                          blockMeta.editorScss ??
                          "",
                        php: blockMeta.php ?? blockSymbolsMeta.php ?? "",
                        js: blockMeta.js ?? "",
                      },
                      changes: changeSet,
                    };

                    if (changeSet.length > 0) {
                      console.log(
                        `🔥 [useHotReload] Triggering hot reload for affected block ${blockId}`
                      );
                      await window.fancooloSimpleHotReload.onStudioSave(
                        blockId,
                        changeSet,
                        payload
                      );
                    }
                  }
                } catch (compileError) {
                  console.error(
                    `❌ [useHotReload] Failed to compile block ${blockId}:`,
                    compileError
                  );
                  throw compileError;
                }
              })()
            );

            const results = await Promise.allSettled(blockTasks);
            const failedBlocks = results.filter(
              (item) => item.status === "rejected"
            ).length;

            if (failedBlocks === 0) {
              // console.log("✅ [useHotReload] All affected blocks recompiled");
            } else {
              console.warn(
                `⚠️ [useHotReload] ${failedBlocks} block recompilations failed`
              );
            }

            if (regenerationOperations.length > 0) {
              await apiClient.request("/operations/bulk", {
                method: "POST",
                body: JSON.stringify({ operations: regenerationOperations }),
              });
            }
          } else {
            console.log("ℹ️ [useHotReload] No blocks use this partial");
          }
        } catch (error) {
          console.error(
            "❌ [useHotReload] Failed to recompile affected blocks:",
            error
          );
        }
      }

      return result;
    },
    [originalSaveFunction, postId, postType]
  );

  return { saveWithHotReload };
};
