/**
 * Fanculo Development Hot Reload Client
 * ES module-based client for admin/editor environments
 */

class DevEventClient {
    constructor() {
        this.lastEventId = fanculoDevData?.lastEventId || 0;
        this.isConnected = false;
        this.useEventSource = false; // Disable SSE, use polling for reliability
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 500; // Faster reconnection for our short-lived connections
        this.eventSource = null;
        this.pollInterval = null;
        this.isShuttingDown = false;

        console.log('🚀 Fanculo Dev Client initializing...', {
            useEventSource: this.useEventSource,
            lastEventId: this.lastEventId,
            streamUrl: fanculoDevData?.streamUrl
        });

        this.init();
    }

    isOldBrowser() {
        return !window.fetch || !window.Promise || !window.EventSource;
    }

    init() {
        if (!fanculoDevData) {
            console.warn('❌ Fanculo Dev: fanculoDevData not available');
            return;
        }

        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => this.shutdown());

        // Start connection
        this.connect();

        // Show HUD
        this.showHUD();
    }

    connect() {
        if (this.isShuttingDown) return;

        this.isConnected = true;

        if (this.useEventSource) {
            this.initEventSource();
        } else {
            this.initPolling();
        }
    }

    initEventSource() {
        const url = new URL(fanculoDevData.streamUrl);
        url.searchParams.set('last-event-id', this.lastEventId.toString());

        console.log('🔗 Connecting to SSE stream:', url.toString());

        if (this.eventSource) {
            this.eventSource.close();
        }

        try {
            this.eventSource = new EventSource(url.toString());

            this.eventSource.addEventListener('open', () => {
                console.log('✅ SSE connection opened');
                this.reconnectAttempts = 0;
                this.updateHUDStatus('connected');
            });

            this.eventSource.addEventListener('connected', (e) => {
                console.log('🎉 Hot reload connected:', e.data);
                this.updateHUDStatus('connected');
            });

            this.eventSource.addEventListener('block_updated', (e) => {
                const event = JSON.parse(e.data);
                console.log('📦 Block updated event:', event);
                this.handleBlockUpdate(event);
                this.lastEventId = event.id;
            });

            this.eventSource.addEventListener('styles_updated', (e) => {
                const event = JSON.parse(e.data);
                console.log('🎨 Styles updated event:', event);
                this.handleStylesUpdate(event);
                this.lastEventId = event.id;
            });

            this.eventSource.addEventListener('scss_updated', (e) => {
                const event = JSON.parse(e.data);
                console.log('📝 SCSS updated event:', event);
                this.handleScssUpdate(event);
                this.lastEventId = event.id;
            });

            this.eventSource.addEventListener('error', (e) => {
                console.warn('❌ SSE error:', e);
                this.updateHUDStatus('error');

                // Check if this is a normal disconnection (readyState 2 = CLOSED)
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    console.log('📡 SSE connection closed normally, will reconnect...');
                } else {
                    console.warn('❌ SSE connection error:', e);
                }

                this.handleReconnect();
            });

        } catch (error) {
            console.error('❌ Failed to create EventSource:', error);
            this.initPolling();
        }
    }

    initPolling() {
        console.log('📡 Using polling for hot reload');
        this.pollInterval = setInterval(() => this.poll(), 2000); // Poll every 2 seconds
        this.updateHUDStatus('connected');
    }

    async poll() {
        try {
            const url = new URL(fanculoDevData.pollUrl);
            url.searchParams.set('since', this.lastEventId.toString());

            // console.log('🔄 Polling:', url.toString()); // Reduce noise

            const response = await fetch(url, {
                headers: {
                    'X-WP-Nonce': fanculoDevData.restNonce
                }
            });

            // console.log('📡 Response status:', response.status, response.statusText); // Reduce noise

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTP error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const responseText = await response.text();
            // console.log('📦 Response text:', responseText); // Reduce noise

            if (!responseText.trim()) {
                console.warn('⚠️ Empty response');
                return;
            }

            const result = JSON.parse(responseText);
            // console.log('📋 Parsed result:', result); // Only log when there are events

            if (result.success && result.data.events) {
                if (result.data.events.length > 0) {
                    console.log('📋 Parsed result:', result); // Only log when there are events
                    console.log(`✅ Processing ${result.data.events.length} events`);

                    result.data.events.forEach(event => {
                        this.handleEvent(event);
                        this.lastEventId = event.id;
                    });

                    this.updateHUDStatus('connected');
                }
            }
        } catch (error) {
            console.warn('📡 Polling failed:', error);
            this.updateHUDStatus('error');
        }
    }

    handleEvent(event) {
        switch (event.type) {
            case 'block_updated':
                this.handleBlockUpdate(event);
                break;
            case 'content_updated':
                // Handle generic content updates (fallback for block updates)
                if (event.payload.type === 'block' || event.payload.type === 'blocks') {
                    console.log('🔄 Content updated - treating as block update:', event.payload.slug);
                    this.handleBlockUpdate(event);
                } else {
                    console.log('📝 Content updated:', event.payload.type, event.payload.slug);
                }
                break;
            case 'styles_updated':
                this.handleStylesUpdate(event);
                break;
            case 'scss_updated':
                this.handleScssUpdate(event);
                break;
            default:
                console.log('📨 Unhandled event type:', event.type, event);
        }
    }

    async handleBlockUpdate(event) {
        const { slug, post_id } = event.payload;
        console.log(`🔄 Handling block update: ${slug}`);

        try {
            // Only refresh if we're in the block editor
            if (!wp?.data?.select('core/block-editor')?.getBlocks) {
                console.log('❌ Block editor not available');
                return;
            }

            const blocks = wp.data.select('core/block-editor').getBlocks();
            const matchingBlocks = this.findBlocksBySlug(blocks, slug);

            for (const block of matchingBlocks) {
                console.log(`🔄 Refreshing block: ${block.name} (${block.clientId})`);
                await this.refreshBlock(block);
            }

            if (matchingBlocks.length > 0) {
                this.showNotification(`Block "${slug}" updated`, 'success');
            }

        } catch (error) {
            console.error('❌ Block update failed:', error);
            this.showNotification(`Block update failed: ${error.message}`, 'error');
        }
    }

    findBlocksBySlug(blocks, slug) {
        const matches = [];
        const findBlocks = (blockList) => {
            for (const block of blockList) {
                if (block.name === `fanculo/${slug}` ||
                    block.name === slug ||
                    block.name.endsWith(`/${slug}`)) {
                    matches.push(block);
                }
                if (block.innerBlocks?.length) {
                    findBlocks(block.innerBlocks);
                }
            }
        };

        findBlocks(blocks);
        console.log(`🔍 Found ${matches.length} blocks matching slug: ${slug}`);
        return matches;
    }

    async refreshBlock(block) {
        try {
            const { dispatch, select } = wp.data;

            console.log('🔄 Refreshing server-side rendered block:', block.name, block.clientId);

            // Strategy: Replace the block entirely to force a fresh render
            // This works better for server-side rendered blocks
            const blockEditor = select('core/block-editor');
            const currentBlock = blockEditor.getBlock(block.clientId);

            if (!currentBlock) {
                console.warn('❌ Block not found for refresh');
                return false;
            }

            // Create a fresh copy of the block with the same attributes
            const freshBlock = wp.blocks.createBlock(
                currentBlock.name,
                { ...currentBlock.attributes },
                currentBlock.innerBlocks
            );

            // Replace the block to trigger a fresh server-side render
            dispatch('core/block-editor').replaceBlock(currentBlock.clientId, freshBlock);

            console.log('✅ Server-side block refreshed via replacement:', block.name);

            return true;
        } catch (error) {
            console.warn('🔄 Block refresh failed:', error);
            return false;
        }
    }

    handleStylesUpdate(event) {
        console.log('🎨 Refreshing styles...');

        // Update CSS with cache busting
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            if (link.href.includes('fanculo')) {
                const url = new URL(link.href);
                url.searchParams.set('v', Date.now());
                link.href = url.toString();
            }
        });

        this.showNotification('Styles refreshed', 'success');
    }

    handleScssUpdate(event) {
        console.log('📝 SCSS cache invalidation:', event);

        // Dispatch custom event for SCSS compiler
        window.dispatchEvent(new CustomEvent('fanculoScssCacheInvalidate', {
            detail: event.payload
        }));

        this.showNotification(`SCSS "${event.payload.slug}" updated`, 'success');
    }

    handleReconnect() {
        if (this.isShuttingDown) return;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * this.reconnectAttempts;

            console.log(`🔄 Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                if (!this.isShuttingDown) {
                    this.isConnected = false;
                    this.connect();
                }
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.updateHUDStatus('failed');
        }
    }

    shutdown() {
        console.log('🛑 Shutting down dev client...');
        this.isShuttingDown = true;

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        this.isConnected = false;
    }

    showHUD() {
        if (document.querySelector('.fanculo-dev-hud')) return;

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
            case 'polling':
                indicator.style.color = '#17a2b8';
                text.textContent = 'Hot Reload ↻';
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

    showNotification(message, type) {
        // Use WordPress notices if available
        if (wp?.data?.dispatch('core/notices')?.createNotice) {
            wp.data.dispatch('core/notices').createNotice(
                type === 'success' ? 'success' : 'error',
                message,
                {
                    id: 'fanculo-dev-' + Date.now(),
                    isDismissible: true,
                    type: 'snackbar'
                }
            );
        } else {
            // Fallback notification
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.fanculoDevData) {
            window.fanculoDevClient = new DevEventClient();
        }
    });
} else {
    if (window.fanculoDevData) {
        window.fanculoDevClient = new DevEventClient();
    }
}

// Expose for debugging
window.DevEventClient = DevEventClient;