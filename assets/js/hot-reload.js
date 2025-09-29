/**
 * Simple Fanculo Hot Reload System
 *
 * Direct browser-to-browser communication for hot reload functionality.
 * Replaces the complex PHP service system with simple JavaScript.
 */

class FanculoSimpleHotReload {
  constructor() {
    this.channel = null;
    this.connected = false;
    this.source = this.detectSource();
    this.init();
  }

  /**
   * Initialize the simple hot reload system
   */
  init() {
    this.setupBroadcastChannel();
    this.setupStorageListener();

    // console.log("🔥 Fanculo Simple Hot Reload initialized for", this.source);
  }

  /**
   * Detect the current source (studio or editor)
   */
  detectSource() {
    const url = window.location.href;

    if (url.includes("post.php") || url.includes("post-new.php")) {
      return "editor";
    } else if (
      url.includes("fanculo") ||
      url.includes("studio") ||
      url.includes("admin.php")
    ) {
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
      this.channel = new BroadcastChannel("fanculo-hot-reload");
      this.channel.onmessage = (event) => this.handleMessage(event.data);
      this.connected = true;
      // console.log("📡 Fanculo Simple BroadcastChannel connected");
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
      if (event.key === "fanculo-hot-reload") {
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

    // console.log("🚀 Fanculo: Sending hot reload signal", message);

    if (this.connected && this.channel) {
      this.channel.postMessage(message);
    } else {
      // Fallback to localStorage
      localStorage.setItem("fanculo-hot-reload", JSON.stringify(message));
      // Trigger storage event for same-window communication
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "fanculo-hot-reload",
          newValue: JSON.stringify(message),
        })
      );
    }
  }

  /**
   * Handle incoming hot reload messages
   */
  handleMessage(data) {
    // console.log("📨 Fanculo: Received hot reload message", data);

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
    //   "🎯 Fanculo Editor: Processing hot reload for block",
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
    //   "🌐 Fanculo Frontend: Processing hot reload for block",
    //   data.blockSlug
    // );

    // Inject updated styles
    if (data.content.css) {
      this.injectStyle(data.blockSlug, data.content.css);
    }

    // For major changes, reload the page
    if (data.changes.includes("php") || data.changes.includes("render")) {
      // console.log("🔄 Fanculo Frontend: Reloading page for structural changes");
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  /**
   * Inject CSS into main document
   */
  injectStyle(blockSlug, css) {
    const styleId = `fanculo-simple-style-${blockSlug}`;

    // Remove existing style
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);

    // console.log("✅ Fanculo: Injected style for block", blockSlug);
  }

  /**
   * Inject CSS into editor iframe
   */
  injectStyleIntoIframe(blockSlug, css, type = "style") {
    const iframe = document.querySelector('iframe[name="editor-canvas"]');
    if (!iframe) {
      console.warn(`❌ Fanculo: Editor iframe not found for ${type} injection`);
      return;
    }

    const styleId = `fanculo-simple-${type}-${blockSlug}`;

    // Wait for iframe to be ready
    const injectIntoIframe = () => {
      try {
        if (
          iframe.contentDocument &&
          iframe.contentDocument.readyState === "complete"
        ) {
          // Remove existing style
          const existingStyle = iframe.contentDocument.getElementById(styleId);
          if (existingStyle) {
            existingStyle.remove();
          }

          // Create new style element
          const style = iframe.contentDocument.createElement("style");
          style.id = styleId;
          style.textContent = css;
          iframe.contentDocument.head.appendChild(style);

          // console.log(
          //   `✅ Fanculo: Injected ${type} into iframe for block`,
          //   blockSlug
          // );
        } else {
          setTimeout(injectIntoIframe, 100);
        }
      } catch (error) {
        console.warn(
          `❌ Fanculo: Failed to inject ${type} into iframe:`,
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

    const findBlocks = (blocks) => {
      let matchingBlocks = [];
      blocks.forEach((block) => {
        if (block.name && block.name.startsWith("fanculo/")) {
          const blockName = block.name.replace("fanculo/", "");
          if (blockName === blockSlug) {
            matchingBlocks.push(block);
          }
        }
        if (block.innerBlocks && block.innerBlocks.length > 0) {
          matchingBlocks = matchingBlocks.concat(findBlocks(block.innerBlocks));
        }
      });
      return matchingBlocks;
    };

    const targetBlocks = findBlocks(blocks);
    // console.log(
    //   "🎯 Fanculo: Found",
    //   targetBlocks.length,
    //   "blocks to refresh for",
    //   blockSlug
    // );

    if (targetBlocks.length > 0) {
      targetBlocks.forEach((block) => {
        // console.log("🔄 Fanculo: Force refreshing block", block.clientId);

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
                fanculoRefresh: Date.now(),
              },
              currentBlock.innerBlocks
            );

            // console.log("🔄 Fanculo: Replacing block to force re-render");
            replaceBlock(block.clientId, newBlock);

            // Clean up the refresh attribute after a short delay
            setTimeout(() => {
              const { getBlock: getBlockAgain } = select("core/block-editor");
              const refreshedBlock = getBlockAgain(newBlock.clientId);
              if (refreshedBlock && refreshedBlock.attributes.fanculoRefresh) {
                const cleanAttributes = { ...refreshedBlock.attributes };
                delete cleanAttributes.fanculoRefresh;
                dispatch("core/block-editor").updateBlockAttributes(
                  newBlock.clientId,
                  cleanAttributes
                );
              }
            }, 500);
          }
        } catch (error) {
          console.warn(
            "🔄 Fanculo: Block replacement failed, trying fallback:",
            error
          );

          // Fallback: Force re-render using attributes
          const originalAttributes = { ...block.attributes };
          const refreshTime = Date.now();

          // Add temporary attribute to force re-render
          dispatch("core/block-editor").updateBlockAttributes(block.clientId, {
            ...originalAttributes,
            fanculoRefresh: refreshTime,
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

      // Use wp.apiFetch if available (authenticated), otherwise use fetch
      if (window.wp?.apiFetch) {
        // console.log(
        //   "🔍 Fanculo: Fetching block data via wp.apiFetch for post",
        //   postId
        // );
        result = await window.wp.apiFetch({
          path: `/funculo/v1/post/${postId}`,
          method: "GET",
        });
        // console.log("✅ Fanculo: API response received", result);
        // console.log("🔍 Fanculo: Meta structure:", result.data?.meta);
        // console.log("🔍 Fanculo: Blocks meta:", result.data?.meta?.blocks);
        // console.log(
        //   "🔍 Fanculo: Available meta keys:",
        //   Object.keys(result.data?.meta?.blocks || {})
        // );
      } else {
        // Fallback to regular fetch (will fail if authentication required)
        const response = await fetch(`/wp-json/funculo/v1/post/${postId}`);
        result = await response.json();
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
   * Studio save handler - call this when saving in studio
   */
  async onStudioSave(postId, changes = ["all"]) {
    console.log("💾 Fanculo Studio: Save detected for post", postId);

    // Wait a moment for SCSS compilation to complete
    console.log("⏳ Fanculo: Waiting for SCSS compilation to complete...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get current block data
    console.log("📡 Fanculo: Fetching block data for post", postId);
    const blockData = await this.fetchBlockData(postId);
    console.log("📦 Fanculo: Block data received:", blockData);

    if (blockData) {
      blockData.changes = changes;
      console.log("🚀 Fanculo: Triggering hot reload with data");
      this.triggerHotReload(blockData);
    } else {
      console.error("❌ Fanculo: No block data received for post", postId);
    }
  }

  /**
   * Destroy the service
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
    }
    this.connected = false;
    // console.log("🔌 Fanculo Simple Hot Reload destroyed");
  }
}

// Initialize the service
let fanculoSimpleHotReload = null;

function initializeFanculoSimpleHotReload() {
  if (!fanculoSimpleHotReload) {
    try {
      fanculoSimpleHotReload = new FanculoSimpleHotReload();

      // Make it globally available
      window.fanculoSimpleHotReload = fanculoSimpleHotReload;

      // Cleanup on page unload
      window.addEventListener("beforeunload", function () {
        if (fanculoSimpleHotReload) {
          fanculoSimpleHotReload.destroy();
        }
      });
    } catch (error) {
      console.error("Fanculo Simple Hot Reload initialization failed:", error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeFanculoSimpleHotReload
  );
} else {
  initializeFanculoSimpleHotReload();
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = FanculoSimpleHotReload;
}
