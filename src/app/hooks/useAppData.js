import { useState, useCallback } from "react";
import centralizedApi from "../../utils/api/CentralizedApiService";

/**
 * Custom hook for managing app-wide data loading
 * Handles posts, SCSS partials, registered blocks, and block categories
 */
export const useAppData = (selectedPost, handlePostSelect) => {
  const [groupedPosts, setGroupedPosts] = useState({
    blocks: [],
    symbols: [],
    "scss-partials": [],
  });

  const [sharedData, setSharedData] = useState({
    scssPartials: { globalPartials: [], availablePartials: [] },
    registeredBlocks: [],
    blockCategories: [],
  });

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState({
    posts: true,
    scssPartials: true,
    registeredBlocks: true,
    blockCategories: true,
  });

  /**
   * Centralized data loading with cache warming and parallel fetching
   */
  const loadAllData = useCallback(
    async (showInitialLoading = true) => {
      try {
        if (showInitialLoading) setLoading(true);

        // Warm cache in background for instant subsequent access
        centralizedApi.warmCache().catch((error) => {
          console.warn("Cache warming failed:", error);
        });

        // Load all shared data in parallel for maximum performance
        const [
          postsResult,
          scssPartialsResult,
          registeredBlocksResult,
          blockCategoriesResult,
        ] = await Promise.allSettled([
          centralizedApi.getPosts({ per_page: 100 }),
          centralizedApi.getScssPartials(),
          centralizedApi.getRegisteredBlocks(),
          centralizedApi.getBlockCategories(),
        ]);

        // Process posts data
        if (postsResult.status === "fulfilled") {
          const posts = postsResult.value.posts || [];
          const grouped = { blocks: [], symbols: [], "scss-partials": [] };

          // Group posts by taxonomy terms
          for (const post of posts) {
            const terms = post.terms;
            if (terms && terms.length > 0) {
              const termSlug = terms[0].slug;
              if (grouped[termSlug]) {
                grouped[termSlug].push(post);
              }
            }
          }
          setGroupedPosts(grouped);

          // Background preload commonly accessed posts
          const allPosts = [
            ...grouped.blocks,
            ...grouped.symbols,
            ...grouped["scss-partials"],
          ];
          if (allPosts.length > 1 && showInitialLoading) {
            const preloadIds = allPosts.slice(1, 4).map((post) => post.id);
            if (preloadIds.length > 0) {
              centralizedApi
                .getBatchPostsWithRelated(preloadIds)
                .catch((error) => {
                  console.warn("Background preloading failed:", error);
                });
            }
          }

          // Auto-select first post if none selected
          if (!selectedPost && showInitialLoading) {
            const firstPost =
              grouped.blocks[0] ||
              grouped.symbols[0] ||
              grouped["scss-partials"][0];
            if (firstPost) {
              handlePostSelect(firstPost);
            }
          }
        }

        // Update shared data state with results
        setSharedData((prevData) => ({
          ...prevData,
          scssPartials:
            scssPartialsResult.status === "fulfilled"
              ? scssPartialsResult.value
              : prevData.scssPartials,
          registeredBlocks:
            registeredBlocksResult.status === "fulfilled"
              ? Array.isArray(registeredBlocksResult.value)
                ? registeredBlocksResult.value
                : registeredBlocksResult.value?.blocks ||
                  registeredBlocksResult.value?.data ||
                  []
              : prevData.registeredBlocks,
          blockCategories:
            blockCategoriesResult.status === "fulfilled"
              ? Array.isArray(blockCategoriesResult.value)
                ? blockCategoriesResult.value
                : []
              : prevData.blockCategories,
        }));

        // Update individual loading states for fine-grained control
        setDataLoading({
          posts: postsResult.status !== "fulfilled",
          scssPartials: scssPartialsResult.status !== "fulfilled",
          registeredBlocks: registeredBlocksResult.status !== "fulfilled",
          blockCategories: blockCategoriesResult.status !== "fulfilled",
        });
      } catch (error) {
        console.error("Error loading app data:", error);
        setGroupedPosts({ blocks: [], symbols: [], "scss-partials": [] });
      } finally {
        if (showInitialLoading) setLoading(false);
      }
    },
    [selectedPost, handlePostSelect]
  );

  /**
   * Refresh all data (can be called after creating new posts)
   */
  const refreshData = useCallback(() => {
    loadAllData(false);
  }, [loadAllData]);

  return {
    groupedPosts,
    setGroupedPosts,
    sharedData,
    loading,
    dataLoading,
    loadAllData,
    refreshData,
  };
};
