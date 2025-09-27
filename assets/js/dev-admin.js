/**
 * Fanculo Development Mode Admin Client
 * Handles admin bar toggle and hot reload functionality in Gutenberg editor
 */

(function() {
    'use strict';

    // Dev Toggle Handler
    class FanculoDevToggle {
        constructor() {
            this.init();
        }

        init() {
            const checkbox = document.getElementById('fanculo-dev-checkbox');
            if (!checkbox) return;

            checkbox.addEventListener('change', (e) => {
                this.handleToggle(e.target.checked);
            });

            // Show current connection status
            this.updateConnectionStatus();

            // Add keyboard shortcut (Ctrl/Cmd + Shift + H)
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
                    e.preventDefault();
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));

                    const message = checkbox.checked ?
                        'Hot reload enabled via keyboard shortcut' :
                        'Hot reload disabled via keyboard shortcut';
                    this.showNotification(message, 'success');
                }
            });
        }

        async handleToggle(enabled) {
            const toggle = document.querySelector('.fanculo-dev-toggle');
            const icon = toggle.querySelector('.toggle-icon');

            // Immediate UI feedback
            toggle.classList.add('loading');
            icon.textContent = '⏳';

            try {
                const formData = new FormData();
                formData.append('action', 'fanculo_toggle_dev_mode');
                formData.append('enable', enabled);
                formData.append('nonce', fanculoDevData.toggleNonce);

                const response = await fetch(fanculoDevData.ajaxUrl, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    const payload = data.data || {};
                    const isEnabled = !!payload.is_enabled;

                    // Update shared dev data
                    fanculoDevData.isDevMode = isEnabled;
                    if (payload.stream_nonce) {
                        fanculoDevData.streamNonce = payload.stream_nonce;
                    }
                    if (payload.stream_url) {
                        fanculoDevData.streamUrl = payload.stream_url;
                    }

                    // Update UI state
                    toggle.classList.remove('loading');
                    toggle.classList.toggle('active', isEnabled);
                    toggle.classList.toggle('inactive', !isEnabled);
                    icon.textContent = isEnabled ? '🔥' : '❄️';

                    // Show success notification
                    this.showNotification(payload.message || 'Hot reload updated', 'success');

                    // Reconnect/disconnect dev clients
                    if (isEnabled) {
                        if (window.fanculoDevInstance?.stopConnection) {
                            window.fanculoDevInstance.stopConnection();
                        }

                        if (window.fanculoDevInstance?.startConnection) {
                            window.fanculoDevInstance.startConnection();
                        } else if (window.FanculoDevClient) {
                            window.fanculoDevInstance = new FanculoDevClient();
                            window.fanculoDevInstance.startConnection?.();
                        }
                    } else {
                        this.disconnectDevClients();
                    }

                } else {
                    throw new Error(data.data?.message || 'Toggle failed');
                }

            } catch (error) {
                console.error('Dev mode toggle failed:', error);

                // Revert checkbox state
                document.getElementById('fanculo-dev-checkbox').checked = !enabled;
                toggle.classList.remove('loading');
                icon.textContent = !enabled ? '🔥' : '❄️';

                this.showNotification(`Toggle failed: ${error.message}`, 'error');
            }
        }

        initializeDevClients() {
            // Start dev client connection when enabled
            if (window.fanculoDevInstance?.startConnection) {
                window.fanculoDevInstance.startConnection();
            } else if (window.FanculoDevClient) {
                // Fallback: create new instance if none exists
                window.fanculoDevInstance = new FanculoDevClient();
            }
        }

        disconnectDevClients() {
            // Stop dev client connection when disabled
            if (window.fanculoDevInstance?.stopConnection) {
                window.fanculoDevInstance.stopConnection();
            }
            fanculoDevData.isDevMode = false;
        }

        showNotification(message, type) {
            // Create floating notification
            const notification = document.createElement('div');
            notification.className = `fanculo-notification ${type}`;
            notification.textContent = message;

            Object.assign(notification.style, {
                position: 'fixed',
                top: '40px',
                right: '20px',
                padding: '12px 20px',
                borderRadius: '6px',
                color: 'white',
                backgroundColor: type === 'success' ? '#28a745' : '#dc3545',
                zIndex: '999999',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transform: 'translateX(100%)',
                transition: 'transform 0.3s ease'
            });

            document.body.appendChild(notification);

            // Animate in
            requestAnimationFrame(() => {
                notification.style.transform = 'translateX(0)';
            });

            // Auto remove
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        updateConnectionStatus() {
            // Add connection indicator to toggle
            const toggle = document.querySelector('.fanculo-dev-toggle');
            if (!toggle) return;

            const indicator = document.createElement('span');
            indicator.className = 'connection-indicator';
            indicator.title = 'Hot reload connection status';

            // Monitor connection and update indicator
            if (window.fanculoDevInstance) {
                indicator.textContent = '●';
                indicator.style.color = '#28a745'; // Connected
            } else {
                indicator.textContent = '●';
                indicator.style.color = '#6c757d'; // Disconnected
            }

            toggle.appendChild(indicator);
        }
    }

    // Hot Reload Client for Gutenberg Editor
    class FanculoDevClient {
        constructor() {
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 5;
            this.useEventSource = window.EventSource && !this.isOldBrowser();
            this.isConnected = false;
            this.shouldReconnect = Boolean(fanculoDevData?.isDevMode);

            // Only start connection if dev mode is currently enabled
            if (this.shouldReconnect) {
                this.initConnection();
            }
            this.showDevHUD();
        }

        // Method to start connection when dev mode is enabled
        startConnection() {
            this.shouldReconnect = true;
            fanculoDevData.isDevMode = true;
            if (!this.isConnected) {
                this.initConnection();
            }
        }

        // Method to stop connection when dev mode is disabled
        stopConnection() {
            this.shouldReconnect = false;
            this.isConnected = false;
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
            this.updateHUDStatus('disconnected');
        }

        isOldBrowser() {
            // Basic check for very old browsers
            return !window.fetch || !window.Promise;
        }

        initConnection() {
            if (!this.shouldReconnect || !fanculoDevData?.isDevMode) {
                return;
            }

            this.isConnected = true;
            if (this.useEventSource) {
                this.initEventSource();
            } else {
                this.initLongPolling();
            }
        }

        initEventSource() {
            const url = fanculoDevData.streamUrl;

            if (this.eventSource) {
                this.eventSource.close();
            }

            this.eventSource = new EventSource(url);

            this.eventSource.addEventListener('connected', () => {
                this.reconnectAttempts = 0;
                this.updateHUDStatus('connected');
                console.log('Fanculo Dev: Connected to hot reload');
            });

            this.eventSource.addEventListener('block_updated', (e) => {
                const data = JSON.parse(e.data);
                this.safeRefreshBlock(data.data.slug);
            });

            this.eventSource.addEventListener('styles_updated', (e) => {
                this.refreshStyles();
            });

            this.eventSource.addEventListener('error', (e) => {
                console.warn('Fanculo Dev: EventSource error', e);
                this.updateHUDStatus('error');
                this.handleReconnect();
            });

            this.eventSource.addEventListener('ping', () => {
                // Heartbeat received, connection is alive
                this.updateHUDStatus('connected');
            });

            this.eventSource.addEventListener('disconnected', (e) => {
                const payload = this.parseEventData(e.data);
                this.handleStreamDisconnect(payload);
            });
        }

        initLongPolling() {
            this.lastTimestamp = Date.now() / 1000;
            this.pollInterval = setInterval(() => this.poll(), 2000);
            console.log('Fanculo Dev: Using long polling fallback');
        }

        async poll() {
            try {
                const response = await fetch(`${fanculoDevData.pollUrl}?since=${this.lastTimestamp}`, {
                    headers: {
                        'X-WP-Nonce': fanculoDevData.restNonce
                    }
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const result = await response.json();

                if (result.success && result.data.events) {
                    result.data.events.forEach(event => {
                        this.handleEvent(event.type, event.data);
                    });

                    this.lastTimestamp = result.data.timestamp;
                    this.updateHUDStatus('connected');
                }
            } catch (error) {
                this.updateHUDStatus('error');
                console.warn('Fanculo Dev: Long polling failed:', error);
            }
        }

        handleEvent(type, data) {
            switch (type) {
                case 'block_updated':
                    this.safeRefreshBlock(data.slug);
                    break;
                case 'styles_updated':
                    this.refreshStyles();
                    break;
                case 'error':
                    this.showError(`Generation error: ${data.message}`);
                    break;
            }
        }

        async safeRefreshBlock(slug) {
            try {
                // Only refresh if we're in the block editor
                if (!wp?.data?.select('core/block-editor')?.getBlocks) {
                    return;
                }

                const blocks = wp.data.select('core/block-editor').getBlocks();
                const matchingBlocks = this.findBlocksBySlug(blocks, slug);

                for (const block of matchingBlocks) {
                    // Try multiple DOM update strategies
                    const success = await this.updateBlockDOM(block) ||
                                   await this.updateBlockPreview(block) ||
                                   await this.forceBlockRefresh(block);

                    if (!success) {
                        console.warn(`Failed to update block ${slug}, falling back to full refresh`);
                        this.fallbackRefresh();
                    }
                }

                if (matchingBlocks.length > 0) {
                    this.showSuccess(`Block ${slug} updated`);
                }
            } catch (error) {
                console.error('Block refresh failed:', error);
                this.showError(`Block refresh failed: ${error.message}`);
            }
        }

        findBlocksBySlug(blocks, slug) {
            const matches = [];
            for (const block of blocks) {
                if (block.name === `fanculo/${slug}`) {
                    matches.push(block);
                }
                // Recursively check inner blocks
                if (block.innerBlocks?.length) {
                    matches.push(...this.findBlocksBySlug(block.innerBlocks, slug));
                }
            }
            return matches;
        }

        async updateBlockDOM(block) {
            const blockElement = document.querySelector(`[data-block="${block.clientId}"]`);
            if (!blockElement) return false;

            // Try multiple selectors for block content
            const selectors = [
                '.block-editor-block-preview__content',
                '.block-editor-block-content',
                '.wp-block',
                `[data-type="fanculo/${block.name.split('/')[1]}"]`
            ];

            for (const selector of selectors) {
                const previewArea = blockElement.querySelector(selector);
                if (previewArea) {
                    const html = await this.fetchBlockHTML(block);
                    if (html) {
                        previewArea.innerHTML = html;
                        return true;
                    }
                }
            }

            return false;
        }

        async updateBlockPreview(block) {
            // Try to use WordPress block preview update if available
            if (wp?.data?.dispatch('core/block-editor')?.updateBlock) {
                try {
                    // Force a minor update to trigger re-render
                    wp.data.dispatch('core/block-editor').updateBlock(block.clientId, {
                        attributes: { ...block.attributes, _hotReloadTimestamp: Date.now() }
                    });
                    return true;
                } catch (error) {
                    console.warn('Block preview update failed:', error);
                }
            }
            return false;
        }

        async forceBlockRefresh(block) {
            // Select the block to ensure it's active, then refresh
            if (wp?.data?.dispatch('core/block-editor')?.selectBlock) {
                try {
                    wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
                    // Small delay to allow selection, then trigger update
                    setTimeout(() => {
                        wp.data.dispatch('core/block-editor').updateBlock(block.clientId, {
                            attributes: block.attributes
                        });
                    }, 100);
                    return true;
                } catch (error) {
                    console.warn('Force block refresh failed:', error);
                }
            }
            return false;
        }

        async fetchBlockHTML(block) {
            try {
                const response = await fetch('/wp-json/fanculo-dev/v1/block-html', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': fanculoDevData.restNonce
                    },
                    body: JSON.stringify({
                        slug: block.name.split('/')[1],
                        post_id: wp?.data?.select('core/editor')?.getCurrentPostId() || 0,
                        attributes: block.attributes,
                        innerHTML: block.innerHTML,
                        innerContent: block.innerContent
                    })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                return data.success ? data.data.html : null;
            } catch (error) {
                console.error('Failed to fetch block HTML:', error);
                return null;
            }
        }

        refreshStyles() {
            // Update CSS with cache busting
            document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                if (link.href.includes('fanculo')) {
                    const url = new URL(link.href);
                    url.searchParams.set('v', Date.now());
                    link.href = url.toString();
                }
            });

            this.showSuccess('Styles refreshed');
        }

        fallbackRefresh() {
            // Last resort: full editor refresh
            if (wp?.data?.dispatch('core/block-editor')?.__unstableRefreshPost) {
                wp.data.dispatch('core/block-editor').__unstableRefreshPost();
            } else {
                // Even more extreme fallback
                console.warn('Fanculo Dev: Full page reload required');
                this.showError('Full page reload required - refresh manually');
            }
        }

        handleStreamDisconnect(payload) {
            const reason = payload?.reason || 'unknown';

            switch (reason) {
                case 'dev_mode_off':
                    console.info('Fanculo Dev: Hot reload disabled by server');
                    fanculoDevData.isDevMode = false;
                    this.stopConnection();
                    break;
                case 'invalid_nonce':
                    console.warn('Fanculo Dev: Stream nonce invalid, stopping connection');
                    this.stopConnection();
                    this.showError('Hot reload token expired – reload the editor');
                    break;
                case 'forbidden':
                    console.warn('Fanculo Dev: Permission denied for hot reload');
                    this.stopConnection();
                    this.showError('Hot reload unavailable – insufficient permissions');
                    break;
                default:
                    if (this.eventSource) {
                        this.eventSource.close();
                        this.eventSource = null;
                    }
                    if (this.pollInterval) {
                        clearInterval(this.pollInterval);
                        this.pollInterval = null;
                    }
                    this.isConnected = false;
                    this.updateHUDStatus('error');
                    this.handleReconnect();
            }
        }

        parseEventData(raw) {
            if (!raw) {
                return null;
            }

            try {
                return JSON.parse(raw);
            } catch (error) {
                console.warn('Fanculo Dev: Failed to parse stream payload', error);
                return null;
            }
        }

        handleReconnect() {
            if (!this.shouldReconnect || !fanculoDevData?.isDevMode) {
                return;
            }

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Fanculo Dev: Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

                setTimeout(() => {
                    this.initConnection();
                }, 1000 * this.reconnectAttempts); // Exponential backoff
            } else {
                console.error('Fanculo Dev: Max reconnection attempts reached');
                this.updateHUDStatus('failed');
            }
        }

        showDevHUD() {
            // Create development HUD in admin
            if (!document.querySelector('.fanculo-dev-hud')) {
                const hud = document.createElement('div');
                hud.className = 'fanculo-dev-hud';
                hud.innerHTML = `
                    <div class="hud-status">
                        <span class="status-indicator">●</span>
                        <span class="status-text">Hot Reload</span>
                    </div>
                `;

                Object.assign(hud.style, {
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: '999998',
                    fontFamily: 'monospace'
                });

                document.body.appendChild(hud);
            }
        }

        updateHUDStatus(status) {
            const hud = document.querySelector('.fanculo-dev-hud');
            if (!hud) return;

            const indicator = hud.querySelector('.status-indicator');
            const text = hud.querySelector('.status-text');

            switch (status) {
                case 'connected':
                    indicator.style.color = '#28a745';
                    text.textContent = 'Hot Reload ✓';
                    break;
                case 'error':
                    indicator.style.color = '#ffc107';
                    text.textContent = 'Hot Reload ⚠';
                    break;
                case 'failed':
                    indicator.style.color = '#dc3545';
                    text.textContent = 'Hot Reload ✗';
                    break;
                default:
                    indicator.style.color = '#6c757d';
                    text.textContent = 'Hot Reload ?';
            }
        }

        showSuccess(message) {
            this.showNotification(message, 'success');
        }

        showError(message) {
            this.showNotification(message, 'error');
        }

        showNotification(message, type) {
            // Use WordPress notices if available, otherwise create custom notification
            if (wp?.data?.dispatch('core/notices')?.createNotice) {
                const noticeType = type === 'success' ? 'success' : 'error';
                wp.data.dispatch('core/notices').createNotice(
                    noticeType,
                    message,
                    {
                        id: 'fanculo-dev-' + Date.now(),
                        isDismissible: true,
                        type: 'snackbar'
                    }
                );
            } else {
                // Fallback to custom notification
                const notification = document.createElement('div');
                notification.textContent = message;
                notification.style.cssText = `
                    position: fixed;
                    top: 60px;
                    right: 20px;
                    background: ${type === 'success' ? '#28a745' : '#dc3545'};
                    color: white;
                    padding: 8px 12px;
                    border-radius: 4px;
                    z-index: 999999;
                    font-size: 12px;
                `;

                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
            }
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize toggle
        if (document.getElementById('fanculo-dev-checkbox')) {
            window.fanculoToggle = new FanculoDevToggle();
        }

        // Initialize dev client if we have the required data (regardless of current dev mode state)
        if (fanculoDevData &&
            (wp?.data?.select('core')?.canUser('create', 'posts') ||
             document.querySelector('#fanculo-dev-checkbox'))) {
            window.fanculoDevInstance = new FanculoDevClient();
        }
    });

    // Also try to initialize when WordPress is ready (for Gutenberg)
    if (window.wp?.domReady) {
        wp.domReady(() => {
            if (fanculoDevData &&
                wp?.data?.select('core/block-editor')?.getBlocks &&
                !window.fanculoDevInstance) {
                window.fanculoDevInstance = new FanculoDevClient();
            }
        });
    }

    // Expose classes globally for debugging
    window.FanculoDevToggle = FanculoDevToggle;
    window.FanculoDevClient = FanculoDevClient;

})();
