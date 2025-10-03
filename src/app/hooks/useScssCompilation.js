import { useMemo, useState, useCallback } from "react";
import { compileScss, apiClient } from "../../utils";
import centralizedApi from "../../utils/api/CentralizedApiService";

/**
 * Custom hook for handling SCSS compilation logic
 * Manages frontend and editor SCSS compilation with partial support
 */
export const useScssCompilation = (selectedPost, metaData, setScssError, setShowToast) => {
  // Get current partials data for compilation
  const getCurrentPartials = useMemo(() => {
    return async () => {
      try {
        // Get global partials using centralized API service with caching
        const partialsData = await centralizedApi.getScssPartials();
        const globalPartials = partialsData.globalPartials || [];
        const availablePartials = partialsData.availablePartials || [];

        // Get selected partial IDs from current state
        // Support both snake_case (from API) and camelCase (from unsaved state)
        let selectedPartialIds = [];
        const selectedPartialsString =
          metaData.blocks?.selected_partials ||
          metaData.blocks?.selectedPartials;
        if (selectedPartialsString) {
          try {
            selectedPartialIds = JSON.parse(selectedPartialsString);
          } catch (e) {
            console.warn("Failed to parse current selected partials:", e);
          }
        }

        // Enrich selected partial IDs with their data
        const enrichedSelectedPartials = [];
        if (Array.isArray(selectedPartialIds)) {
          // Create a combined lookup map for efficiency
          const allPartials = [...globalPartials, ...availablePartials];
          const partialsLookup = {};
          allPartials.forEach((partial) => {
            partialsLookup[partial.id] = partial;
          });

          selectedPartialIds.forEach((partialId, index) => {
            // Handle both number and string IDs
            const id =
              typeof partialId === "string" ? parseInt(partialId) : partialId;
            const partialData = partialsLookup[id];

            if (partialData) {
              enrichedSelectedPartials.push({
                id: partialData.id,
                title: partialData.title,
                slug: partialData.slug,
                order: index + 1, // Use the order from the selected array
              });
            } else {
              // If partial data not found, create a minimal object
              console.warn(
                `Selected partial ${id} not found in available partials`
              );
              enrichedSelectedPartials.push({
                id: id,
                title: `Partial ${id}`,
                slug: `partial-${id}`,
                order: index + 1,
              });
            }
          });
        }

        return { globalPartials, selectedPartials: enrichedSelectedPartials };
      } catch (error) {
        console.error("Error getting current partials:", error);
        return { globalPartials: [], selectedPartials: [] };
      }
    };
  }, [metaData.blocks?.selected_partials, metaData.blocks?.selectedPartials]);

  /**
   * Compile frontend SCSS with partials support
   */
  const compileFrontendScss = useCallback(async () => {
    const hasScssContent =
      selectedPost?.terms?.some((term) => term.slug === "blocks") &&
      metaData.blocks?.scss;

    if (!hasScssContent) {
      return null;
    }

    try {
      // Get current partials data for real-time compilation
      const currentPartials = await getCurrentPartials();

      // Compile SCSS to CSS with current partials support
      const scssContent = metaData.blocks.scss;
      const cssContent = await compileScss(
        scssContent,
        selectedPost.id,
        currentPartials
      );

      // Save both SCSS and compiled CSS
      await centralizedApi.saveScssContent(selectedPost.id, {
        scss_content: scssContent,
        css_content: cssContent,
      });

      return {
        scssContent,
        cssContent,
      };
    } catch (compilationError) {
      console.error("❌ SCSS compilation failed:", compilationError);
      const errorMessage =
        compilationError.message || "SCSS compilation failed";
      setScssError(errorMessage);
      setShowToast(true);
      // Continue with normal save even if SCSS compilation fails
      return null;
    }
  }, [selectedPost, metaData.blocks?.scss, getCurrentPartials, setScssError, setShowToast]);

  /**
   * Compile editor SCSS with partials support
   */
  const compileEditorScss = useCallback(async () => {
    const hasEditorScssContent =
      selectedPost?.terms?.some((term) => term.slug === "blocks") &&
      metaData.blocks?.editorScss;

    if (!hasEditorScssContent) {
      return null;
    }

    try {
      // Get editor partials for compilation
      const editorPartialsData = await apiClient.getScssPartials();
      const globalPartials = editorPartialsData.globalPartials || [];
      const availablePartials =
        editorPartialsData.availablePartials || [];

      // Parse editor selected partials
      // Support both snake_case (from API) and camelCase (from unsaved state)
      let editorSelectedPartialIds = [];
      const editorSelectedPartialsString =
        metaData.blocks?.editor_selected_partials ||
        metaData.blocks?.editorSelectedPartials;
      if (editorSelectedPartialsString) {
        try {
          editorSelectedPartialIds = JSON.parse(
            editorSelectedPartialsString
          );
        } catch (e) {
          console.warn("Failed to parse editor selected partials:", e);
        }
      }

      // Enrich editor selected partial IDs with their data
      const enrichedEditorSelectedPartials = [];
      if (Array.isArray(editorSelectedPartialIds)) {
        const allPartials = [...globalPartials, ...availablePartials];

        const partialsLookup = {};
        allPartials.forEach((partial) => {
          partialsLookup[partial.id] = partial;
        });

        editorSelectedPartialIds.forEach((partialId, index) => {
          const id =
            typeof partialId === "string"
              ? parseInt(partialId)
              : partialId;
          const partialData = partialsLookup[id];

          if (partialData) {
            enrichedEditorSelectedPartials.push({
              id: partialData.id,
              title: partialData.title,
              slug: partialData.slug,
              order: index + 1,
            });
          }
        });
      }

      const editorCurrentPartials = {
        globalPartials,
        selectedPartials: enrichedEditorSelectedPartials,
      };

      // Compile editor SCSS to CSS with partials support
      const editorScssContent = metaData.blocks.editorScss;
      // Pass null as postId to force using our provided editorCurrentPartials
      const editorCssContent = await compileScss(
        editorScssContent,
        null,
        editorCurrentPartials
      );

      // Save both editor SCSS and compiled CSS
      await centralizedApi.saveEditorScssContent(selectedPost.id, {
        editor_scss_content: editorScssContent,
        editor_css_content: editorCssContent,
      });

      return {
        scssContent: editorScssContent,
        cssContent: editorCssContent,
      };
    } catch (compilationError) {
      console.error(
        "❌ Editor SCSS compilation failed:",
        compilationError
      );
      const errorMessage =
        compilationError.message || "Editor SCSS compilation failed";
      setScssError(errorMessage);
      setShowToast(true);
      // Continue with normal save even if editor SCSS compilation fails
      return null;
    }
  }, [selectedPost, metaData.blocks?.editorScss, metaData.blocks?.editor_selected_partials, metaData.blocks?.editorSelectedPartials, setScssError, setShowToast]);

  /**
   * Compile both frontend and editor SCSS
   */
  const compileAllScss = useCallback(async () => {
    const [frontend, editor] = await Promise.all([
      compileFrontendScss(),
      compileEditorScss()
    ]);

    return {
      frontend,
      editor,
    };
  }, [compileFrontendScss, compileEditorScss]);

  return {
    getCurrentPartials,
    compileFrontendScss,
    compileEditorScss,
    compileAllScss
  };
};
