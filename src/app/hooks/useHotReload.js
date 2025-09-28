import { useState, useEffect, useCallback } from "react";

/**
 * Hot Reload Hook
 *
 * Provides hot reload functionality for React components
 */
export const useHotReload = (postId, fileType) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Trigger hot reload
  const triggerHotReload = useCallback(async () => {
    if (!postId || !fileType || isLoading) return;

    setIsLoading(true);
    try {
      // Get nonce from WordPress
      const nonce = window.wpApiSettings?.nonce ||
                   document.querySelector('meta[name="fanculo-nonce"]')?.content ||
                   window.fanculoHotReload?.nonce;

      const headers = {
        "Content-Type": "application/json",
      };

      // Add nonce to headers if available
      if (nonce) {
        headers["X-WP-Nonce"] = nonce;
      }

      const response = await fetch("/wp-json/fanculo/v1/hot-reload-trigger", {
        method: "POST",
        headers,
        body: JSON.stringify({
          post_id: postId,
          file_type: fileType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastUpdate(new Date());
        return data;
      } else {
        console.warn("Hot reload trigger failed:", response.status, response.statusText);
      }
    } catch (error) {
      console.warn("Failed to trigger hot reload:", error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, fileType, isLoading]);

  // Listen for hot reload events
  useEffect(() => {
    const handleHotReloadEvent = (event) => {
      if (event.detail && event.detail.type === "hot-reload") {
        setLastUpdate(new Date());
      }
    };

    window.addEventListener("fanculo-hot-reload", handleHotReloadEvent);
    return () =>
      window.removeEventListener("fanculo-hot-reload", handleHotReloadEvent);
  }, []);

  return {
    triggerHotReload,
    isLoading,
    lastUpdate,
    isEnabled,
  };
};

/**
 * Hot Reload Save Handler
 *
 * Wraps save functions to automatically trigger simple hot reload
 */
export const useHotReloadSave = (postId, fileType, originalSaveFunction) => {
  const { isLoading } = useHotReload(postId, fileType);

  const saveWithHotReload = useCallback(
    async (...args) => {
      // Call original save function
      const result = await originalSaveFunction(...args);

      // Trigger simple hot reload after successful save
      console.log("🔥 Simple Hot Reload Save: Save completed, result:", result ? "success" : "error");

      // Always trigger hot reload after save (unless there was an error)
      if (!result || !result.error) {
        console.log("🔥 Simple Hot Reload Save: Triggering hot reload for post", postId);
        try {
          // Use the new simple hot reload system
          if (window.fanculoSimpleHotReload) {
            await window.fanculoSimpleHotReload.onStudioSave(postId, ["all"]);
            console.log("🔥 Simple Hot Reload Save: Hot reload triggered successfully");
          } else {
            console.warn("🔥 Simple Hot Reload Save: Simple hot reload not available");
          }
        } catch (error) {
          console.warn("🔥 Simple Hot Reload Save: Failed to trigger hot reload:", error);
        }
      } else {
        console.log("🔥 Simple Hot Reload Save: Skipping hot reload due to save error");
      }

      return result;
    },
    [originalSaveFunction, postId]
  );

  return {
    saveWithHotReload,
    isLoading,
  };
};

/**
 * Hot Reload Status Hook
 *
 * Provides global hot reload status
 */
export const useHotReloadStatus = () => {
  const [status, setStatus] = useState("idle");
  const [settings, setSettings] = useState({
    enabled: true,
    debounce_delay: 500,
    frontend_live_reload: false,
  });

  // Check status
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch("/wp-json/fanculo/v1/hot-reload-status");
      const data = await response.json();
      setStatus(data.status || "idle");
    } catch (error) {
      console.warn("Failed to check hot reload status:", error);
    }
  }, []);

  // Get settings
  const getSettings = useCallback(async () => {
    try {
      const response = await fetch("/wp-json/fanculo/v1/hot-reload/settings");
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.warn("Failed to get hot reload settings:", error);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings) => {
    try {
      const response = await fetch("/wp-json/fanculo/v1/hot-reload/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({ ...prev, ...data.updated }));
        return data;
      }
    } catch (error) {
      console.warn("Failed to update hot reload settings:", error);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    getSettings();
    checkStatus();
  }, [getSettings, checkStatus]);

  // Set up periodic status checking
  useEffect(() => {
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    status,
    settings,
    updateSettings,
    checkStatus,
  };
};
