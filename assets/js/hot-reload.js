/**
 * Simple FanCoolo Hot Reload System
 *
 * Direct browser-to-browser communication for hot reload functionality.
 * Replaces the complex PHP service system with simple JavaScript.
 */

class FanCooloSimpleHotReload {
  constructor() {
    this.channel = null;
    this.connected = false;
    this.source = this.detectSource();
    this.lastSavedContent = {}; // Track last saved content per block
    this.init();
  }

  /**
   * Initialize the simple hot reload system
   */
  init() {
    this.setupBroadcastChannel();
    this.setupStorageListener();

    // console.log("🔥 FanCoolo Simple Hot Reload initialized for", this.source);
  }

  /**
   * Detect the current source (studio or editor)
   */
  detectSource() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // Check if we're in WordPress admin area
    const isAdmin = pathname.includes("/wp-admin/");

    if (isAdmin && (url.includes("post.php") || url.includes("post-new.php"))) {
      return "editor";
    } else if (isAdmin) {
      return "studio";
    } else {
      return "frontend";
    }
  }

  /**
   * Setup BroadcastChannel for real-time communication
   */
  setupBroadcastChannel() {
    try {
      this.channel = new BroadcastChannel("fancoolo-hot-reload");
      this.channel.onmessage = (event) => this.handleMessage(event.data);
      this.connected = true;
      // console.log("📡 FanCoolo Simple BroadcastChannel connected");
    } catch (error) {
      console.warn(
        "❌ BroadcastChannel not supported, using localStorage fallback"
      );
      this.connected = false;
    }
  }

  /**
   * Setup localStorage listener as fallback
   */
  setupStorageListener() {
    window.addEventListener("storage", (event) => {
      if (event.key === "fancoolo-hot-reload") {
        try {
          const data = JSON.parse(event.newValue);
          this.handleMessage(data);
        } catch (error) {
          console.warn("Failed to parse storage hot reload data:", error);
        }
      }
    });
  }

  /**
   * Send hot reload signal from studio when saving
   */
  triggerHotReload(blockData) {
    const message = {
      type: "hot-reload",
      source: this.source,
      timestamp: Date.now(),
      blockId: blockData.postId,
      blockSlug: blockData.blockSlug || blockData.slug,
      blockName: blockData.blockName || blockData.title,
      changes: blockData.changes || ["all"],
      content: blockData.content || {},
    };

    // console.log("🚀 FanCoolo: Sending hot reload signal", message);

    if (this.connected && this.channel) {
      this.channel.postMessage(message);
    } else {
      // Fallback to localStorage - stringify once
      const messageJson = JSON.stringify(message);
      localStorage.setItem("fancoolo-hot-reload", messageJson);
      // Trigger storage event for same-window communication
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "fancoolo-hot-reload",
          newValue: messageJson,
        })
      );
    }
  }

  /**
   * Handle incoming hot reload messages
   */
  handleMessage(data) {
    // console.log("📨 FanCoolo: Received hot reload message", data);

    if (!data || !data.type || data.type !== "hot-reload") {
      return;
    }

    // Only process messages from other sources
    if (data.source === this.source) {
      return;
    }

    switch (this.source) {
      case "editor":
        this.handleEditorHotReload(data);
        break;
      case "frontend":
        this.handleFrontendHotReload(data);
        break;
      default:
      // console.log(
      //   "📨 Hot reload received but not processed for source:",
      //   this.source
      // );
    }
  }

  /**
   * Handle hot reload in Gutenberg editor
   */
  handleEditorHotReload(data) {
    // console.log(
    //   "🎯 FanCoolo Editor: Processing hot reload for block",
    //   data.blockSlug
    // );
    // console.log("📦 Content received:", {
    //   css: data.content?.css?.length || 0,
    //   editorCss: data.content?.editorCss?.length || 0,
    //   php: data.content?.php?.length || 0,
    //   js: data.content?.js?.length || 0,
    // });

    // Show first 200 chars of PHP content for debugging
    // if (data.content?.php) {
    //   console.log(
    //     "🔍 PHP content preview:",
    //     data.content.php.substring(0, 200) + "..."
    //   );
    // }

    if (!window.wp?.data) {
      console.warn("wp.data not available for block refresh");
      return;
    }

    // Inject updated styles immediately
    if (data.content.css) {
      // console.log(
      //   "💉 Injecting CSS:",
      //   data.content.css.substring(0, 100) + "..."
      // );
      this.injectStyle(data.blockSlug, data.content.css);
      this.injectStyleIntoIframe(data.blockSlug, data.content.css);
    } else {
      console.log("⚠️ No CSS content to inject");
    }

    if (data.content.editorCss) {
      // console.log(
      //   "💉 Injecting Editor CSS:",
      //   data.content.editorCss.substring(0, 100) + "..."
      // );
      this.injectStyleIntoIframe(
        data.blockSlug,
        data.content.editorCss,
        "editor"
      );
    }

    // Refresh blocks in editor
    this.refreshBlocksInEditor(data.blockSlug);
  }

  /**
   * Handle hot reload on frontend
   */
  handleFrontendHotReload(data) {
    // console.log(
    //   "🌐 FanCoolo Frontend: Processing hot reload for block",
    //   data.blockSlug
    // );

    // Default changes to ["all"] if not provided
    const changes = data.changes || ["all"];

    // Check if PHP content changed (requires full page reload)
    const hasPhpChanges =
      changes.includes("php") ||
      changes.includes("render") ||
      changes.includes("all");

    if (hasPhpChanges) {
      // console.log("🔄 FanCoolo Frontend: Reloading page for structural changes");
      window.location.reload();
      return;
    }

    // CSS-only changes: instant update without reload
    if (changes.includes("css") && data.content && data.content.css) {
      this.injectStyle(data.blockSlug, data.content.css);
    }
  }

  /**
   * Inject CSS into main document
   */
  injectStyle(blockSlug, css) {
    const styleId = `fancoolo-simple-style-${blockSlug}`;

    // Reuse existing style element if present
    let style = document.getElementById(styleId);
    if (style) {
      style.textContent = css;
    } else {
      // Create new style element
      style = document.createElement("style");
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style);
    }

    // console.log("✅ FanCoolo: Injected style for block", blockSlug);
  }

  /**
   * Inject CSS into editor iframe
   */
  injectStyleIntoIframe(blockSlug, css, type = "style") {
    const iframe = document.querySelector('iframe[name="editor-canvas"]');
    if (!iframe) {
      console.warn(
        `❌ FanCoolo: Editor iframe not found for ${type} injection`
      );
      return;
    }

    const styleId = `fancoolo-simple-${type}-${blockSlug}`;
    const MAX_ATTEMPTS = 50; // 5 seconds max
    let attempts = 0;

    // Wait for iframe to be ready
    const injectIntoIframe = () => {
      try {
        if (
          iframe.contentDocument &&
          iframe.contentDocument.readyState === "complete"
        ) {
          // Reuse existing style element if present
          let style = iframe.contentDocument.getElementById(styleId);
          if (style) {
            style.textContent = css;
          } else {
            // Create new style element
            style = iframe.contentDocument.createElement("style");
            style.id = styleId;
            style.textContent = css;
            iframe.contentDocument.head.appendChild(style);
          }

          // console.log(
          //   `✅ FanCoolo: Injected ${type} into iframe for block`,
          //   blockSlug
          // );
        } else if (attempts < MAX_ATTEMPTS) {
          attempts++;
          setTimeout(injectIntoIframe, 100);
        } else {
          console.warn(
            `❌ FanCoolo: Iframe not ready after ${MAX_ATTEMPTS} attempts`
          );
        }
      } catch (error) {
        console.warn(
          `❌ FanCoolo: Failed to inject ${type} into iframe:`,
          error
        );
      }
    };

    injectIntoIframe();
  }

  /**
   * Refresh blocks in Gutenberg editor
   */
  refreshBlocksInEditor(blockSlug) {
    const { select, dispatch } = window.wp.data;
    const blocks = select("core/block-editor").getBlocks();

    // Early return if no blocks at all
    if (!blocks || blocks.length === 0) {
      return;
    }

    const targetBlockName = `fancoolo/${blockSlug}`;

    const findBlocks = (blocks) => {
      let matchingBlocks = [];
      blocks.forEach((block) => {
        // Direct comparison is faster than string manipulation
        if (block.name === targetBlockName) {
          matchingBlocks.push(block);
        }
        if (block.innerBlocks && block.innerBlocks.length > 0) {
          matchingBlocks = matchingBlocks.concat(findBlocks(block.innerBlocks));
        }
      });
      return matchingBlocks;
    };

    const targetBlocks = findBlocks(blocks);
    // console.log(
    //   "🎯 FanCoolo: Found",
    //   targetBlocks.length,
    //   "blocks to refresh for",
    //   blockSlug
    // );

    if (targetBlocks.length > 0) {
      targetBlocks.forEach((block) => {
        // console.log("🔄 FanCoolo: Force refreshing block", block.clientId);

        // Strategy 1: Replace the block entirely to force complete re-render
        try {
          const { getBlock } = select("core/block-editor");
          const { replaceBlock } = dispatch("core/block-editor");

          // Get current block data
          const currentBlock = getBlock(block.clientId);
          if (currentBlock) {
            // Create a new block with the same attributes but force re-render
            const newBlock = wp.blocks.createBlock(
              currentBlock.name,
              {
                ...currentBlock.attributes,
                // Add a timestamp to force WordPress to re-render
                fancooloRefresh: Date.now(),
              },
              currentBlock.innerBlocks
            );

            // console.log("🔄 FanCoolo: Replacing block to force re-render");
            replaceBlock(block.clientId, newBlock);

            // Clean up the refresh attribute after a short delay
            setTimeout(() => {
              const { getBlock: getBlockAgain } = select("core/block-editor");
              const refreshedBlock = getBlockAgain(newBlock.clientId);
              if (refreshedBlock && refreshedBlock.attributes.fancooloRefresh) {
                const cleanAttributes = { ...refreshedBlock.attributes };
                delete cleanAttributes.fancooloRefresh;
                dispatch("core/block-editor").updateBlockAttributes(
                  newBlock.clientId,
                  cleanAttributes
                );
              }
            }, 500);
          }
        } catch (error) {
          console.warn(
            "🔄 FanCoolo: Block replacement failed, trying fallback:",
            error
          );

          // Fallback: Force re-render using attributes
          const originalAttributes = { ...block.attributes };
          const refreshTime = Date.now();

          // Add temporary attribute to force re-render
          dispatch("core/block-editor").updateBlockAttributes(block.clientId, {
            ...originalAttributes,
            fancooloRefresh: refreshTime,
          });

          // Remove temporary attribute
          setTimeout(() => {
            dispatch("core/block-editor").updateBlockAttributes(
              block.clientId,
              originalAttributes
            );
          }, 200);
        }
      });
    }
  }

  /**
   * Get block data from current post meta
   */
  async fetchBlockData(postId) {
    try {
      let result;

      // Use wp.apiFetch if available (authenticated), otherwise use fetch with nonce
      if (window.wp?.apiFetch) {
        // console.log(
        //   "🔍 FanCoolo: Fetching block data via wp.apiFetch for post",
        //   postId
        // );
        result = await window.wp.apiFetch({
          path: `/funculo/v1/post/${postId}`,
          method: "GET",
        });
        // console.log("✅ FanCoolo: API response received", result);
        // console.log("🔍 FanCoolo: Meta structure:", result.data?.meta);
        // console.log("🔍 FanCoolo: Blocks meta:", result.data?.meta?.blocks);
        // console.log(
        //   "🔍 FanCoolo: Available meta keys:",
        //   Object.keys(result.data?.meta?.blocks || {})
        // );
      } else if (window.fancooloHotReload?.nonce) {
        // Fallback to regular fetch with nonce header
        const response = await fetch(`/wp-json/funculo/v1/post/${postId}`, {
          headers: {
            "X-WP-Nonce": window.fancooloHotReload.nonce,
          },
        });
        result = await response.json();
      } else {
        console.error(
          "FanCoolo: No authentication method available (wp.apiFetch or nonce)"
        );
        return null;
      }

      if (!result.success || !result.data) {
        console.warn("Failed to fetch block data: API returned error", result);
        return null;
      }

      const post = result.data;

      return {
        postId: post.id,
        blockSlug: post.slug,
        blockName: post.title?.rendered || post.title,
        content: {
          css: post.meta?.blocks?.cssContent || post.meta?.blocks?.scss || "",
          editorCss:
            post.meta?.blocks?.editorCssContent ||
            post.meta?.blocks?.editorScss ||
            "",
          php: post.meta?.blocks?.php || post.meta?.symbols?.php || "",
          js: post.meta?.blocks?.js || "",
        },
      };
    } catch (error) {
      console.warn("Failed to fetch block data:", error);
      return null;
    }
  }

  /**
   * Detect what actually changed by comparing with last saved state
   */
  detectChanges(postId, newContent) {
    const lastContent = this.lastSavedContent[postId];

    if (!lastContent) {
      // First save, assume all changed
      this.lastSavedContent[postId] = { ...newContent };
      return ["all"];
    }

    const changes = [];

    if (lastContent.css !== newContent.css) {
      changes.push("css");
    }
    if (lastContent.editorCss !== newContent.editorCss) {
      changes.push("editorCss");
    }
    if (lastContent.php !== newContent.php) {
      changes.push("php");
    }
    if (lastContent.js !== newContent.js) {
      changes.push("js");
    }

    // Update last saved state
    this.lastSavedContent[postId] = { ...newContent };

    // If nothing changed, return empty array (shouldn't happen, but just in case)
    return changes.length > 0 ? changes : ["all"];
  }

  /**
   * Studio save handler - call this when saving in studio
   */
  async onStudioSave(postId, changes = null, payload = {}) {
    const providedContent = payload?.content;
    let blockData = null;

    if (providedContent) {
      const previousContent = this.lastSavedContent[postId] || {};
      blockData = {
        postId,
        blockSlug:
          payload.blockSlug || payload.slug || payload?.post?.slug || null,
        blockName:
          payload.blockName ||
          payload.title ||
          payload?.post?.title?.rendered ||
          payload?.post?.title ||
          null,
        content: {
          css:
            providedContent.css !== undefined
              ? providedContent.css
              : previousContent.css ?? "",
          editorCss:
            providedContent.editorCss !== undefined
              ? providedContent.editorCss
              : previousContent.editorCss ?? "",
          php:
            providedContent.php !== undefined
              ? providedContent.php
              : previousContent.php ?? "",
          js:
            providedContent.js !== undefined
              ? providedContent.js
              : previousContent.js ?? "",
        },
      };
    }

    const needsFetch =
      !blockData ||
      !blockData.blockSlug ||
      !blockData.blockName ||
      !blockData.content;

    if (needsFetch) {
      const fetchedData = await this.fetchBlockData(postId);
      if (fetchedData) {
        blockData = {
          ...fetchedData,
          content: {
            ...fetchedData.content,
            ...(blockData?.content || providedContent || {}),
          },
        };

        if (!blockData.blockSlug && payload.blockSlug) {
          blockData.blockSlug = payload.blockSlug;
        }
        if (!blockData.blockName && payload.blockName) {
          blockData.blockName = payload.blockName;
        }
      }
    }

    if (!blockData) {
      console.error("❌ FanCoolo: No block data received for post", postId);
      return;
    }

    let effectiveChanges = changes || payload?.changes;

    if (!effectiveChanges || effectiveChanges.length === 0) {
      effectiveChanges = this.detectChanges(postId, blockData.content);
    } else if (!Array.isArray(effectiveChanges)) {
      effectiveChanges = [effectiveChanges];
    } else {
      // Sync internal cache when caller supplies explicit changes
      this.lastSavedContent[postId] = { ...blockData.content };
    }

    blockData.changes = effectiveChanges.length ? effectiveChanges : ["all"];
    this.triggerHotReload(blockData);
  }

  /**
   * Destroy the service
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
    }
    this.connected = false;
    // console.log("🔌 FanCoolo Simple Hot Reload destroyed");
  }
}

// Initialize the service
let fancooloSimpleHotReload = null;

function initializeFanCooloSimpleHotReload() {
  if (!fancooloSimpleHotReload) {
    try {
      fancooloSimpleHotReload = new FanCooloSimpleHotReload();

      // Make it globally available
      window.fancooloSimpleHotReload = fancooloSimpleHotReload;

      // Cleanup on page unload
      window.addEventListener("beforeunload", function () {
        if (fancooloSimpleHotReload) {
          fancooloSimpleHotReload.destroy();
        }
      });
    } catch (error) {
      console.error("FanCoolo Simple Hot Reload initialization failed:", error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeFanCooloSimpleHotReload
  );
} else {
  initializeFanCooloSimpleHotReload();
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = FanCooloSimpleHotReload;
}
