/**
 * Fanculo Development Frontend Client
 * Lightweight client for frontend hot reload
 */

class FrontendDevClient {
    constructor() {
        this.lastEventId = fanculoDevData?.lastEventId || 0;
        this.isConnected = false;
        this.useEventSource = false; // Use polling for reliability
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.eventSource = null;
        this.pollInterval = null;

        console.log('🌐 Fanculo Frontend Dev Client initializing...');

        this.init();
    }

    isOldBrowser() {
        return !window.fetch || !window.Promise || !window.EventSource;
    }

    init() {
        if (!fanculoDevData) {
            console.warn('❌ fanculoDevData not available');
            return;
        }

        this.connect();
        this.markBlocks();
        this.showIndicator();
    }

    connect() {
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

        if (this.eventSource) {
            this.eventSource.close();
        }

        try {
            this.eventSource = new EventSource(url.toString());

            this.eventSource.addEventListener('open', () => {
                this.reconnectAttempts = 0;
                this.updateIndicatorStatus('connected');
            });

            this.eventSource.addEventListener('block_updated', (e) => {
                const event = JSON.parse(e.data);
                this.handleBlockUpdate(event);
                this.lastEventId = event.id;
            });

            this.eventSource.addEventListener('error', () => {
                this.updateIndicatorStatus('error');
                this.handleReconnect();
            });

        } catch (error) {
            console.warn('❌ EventSource failed, using polling');
            this.initPolling();
        }
    }

    initPolling() {
        this.pollInterval = setInterval(() => this.poll(), 2000); // Poll every 2 seconds
        this.updateIndicatorStatus('connected');
    }

    async poll() {
        try {
            const url = new URL(fanculoDevData.pollUrl);
            url.searchParams.set('since', this.lastEventId.toString());

            const response = await fetch(url, {
                headers: {
                    'X-WP-Nonce': fanculoDevData.restNonce
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            if (result.success && result.data.events) {
                result.data.events.forEach(event => {
                    if (event.type === 'block_updated') {
                        this.handleBlockUpdate(event);
                    }
                    this.lastEventId = event.id;
                });
            }
        } catch (error) {
            this.updateIndicatorStatus('error');
        }
    }

    async handleBlockUpdate(event) {
        const { slug, post_id } = event.payload;
        console.log(`🔄 Frontend block update: ${slug}`);

        const blocks = document.querySelectorAll(
            `[data-fanculo-block="${slug}"], .wp-block-fanculo-${slug}`
        );

        for (const block of blocks) {
            try {
                await this.updateBlockContent(block, slug, post_id);
            } catch (error) {
                console.warn(`❌ Failed to update block ${slug}:`, error);
            }
        }

        if (blocks.length > 0) {
            this.showNotification(`Block "${slug}" updated`);
        }
    }

    async updateBlockContent(blockElement, slug, postId) {
        try {
            const response = await fetch(fanculoDevData.blockHtmlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': fanculoDevData.restNonce
                },
                body: JSON.stringify({
                    slug: slug,
                    post_id: postId,
                    attributes: this.extractBlockAttributes(blockElement)
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.success && data.data.html) {
                // Create temporary container
                const temp = document.createElement('div');
                temp.innerHTML = data.data.html;
                const newBlock = temp.firstElementChild;

                if (newBlock) {
                    // Preserve any dev indicators
                    const oldIndicator = blockElement.querySelector('.fanculo-dev-block-indicator');

                    // Replace the block
                    blockElement.parentNode.replaceChild(newBlock, blockElement);

                    // Re-mark the new block
                    this.markBlock(newBlock, slug);

                    console.log(`✅ Updated frontend block: ${slug}`);
                }
            }
        } catch (error) {
            console.warn(`❌ Block update failed for ${slug}:`, error);
        }
    }

    extractBlockAttributes(block) {
        const attributes = {};

        // Extract from data attributes
        Array.from(block.attributes).forEach(attr => {
            if (attr.name.startsWith('data-attr-')) {
                const attrName = attr.name.replace('data-attr-', '');
                attributes[attrName] = attr.value;
            }
        });

        return attributes;
    }

    markBlocks() {
        // Find and mark Fanculo blocks
        const selectors = [
            '[class*="wp-block-fanculo-"]',
            '[data-type*="fanculo/"]',
            '.fanculo-block'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(block => {
                const slug = this.extractSlugFromBlock(block);
                if (slug) {
                    this.markBlock(block, slug);
                }
            });
        });
    }

    markBlock(block, slug) {
        block.setAttribute('data-fanculo-block', slug);

        // Add mini dev indicator
        if (!block.querySelector('.fanculo-dev-block-indicator')) {
            this.addBlockIndicator(block, slug);
        }
    }

    extractSlugFromBlock(block) {
        // From CSS class
        const classList = block.className.split(' ');
        const fanculoClass = classList.find(c => c.startsWith('wp-block-fanculo-'));
        if (fanculoClass) {
            return fanculoClass.replace('wp-block-fanculo-', '');
        }

        // From data attribute
        const dataType = block.getAttribute('data-type');
        if (dataType && dataType.startsWith('fanculo/')) {
            return dataType.replace('fanculo/', '');
        }

        return null;
    }

    addBlockIndicator(block, slug) {
        const indicator = document.createElement('div');
        indicator.className = 'fanculo-dev-block-indicator';
        indicator.textContent = `🔥 ${slug}`;
        indicator.title = `Fanculo block: ${slug}`;

        Object.assign(indicator.style, {
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'rgba(255, 69, 0, 0.8)',
            color: 'white',
            padding: '2px 6px',
            fontSize: '10px',
            borderRadius: '2px',
            zIndex: '1000',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            opacity: '0.7'
        });

        // Ensure parent has relative positioning
        const blockStyle = window.getComputedStyle(block);
        if (blockStyle.position === 'static') {
            block.style.position = 'relative';
        }

        block.appendChild(indicator);
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                this.isConnected = false;
                this.connect();
            }, 2000 * this.reconnectAttempts);
        } else {
            this.updateIndicatorStatus('failed');
        }
    }

    showIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'fanculo-dev-indicator';
        indicator.innerHTML = `
            <span class="indicator-icon">🔥</span>
            <span class="indicator-text">Dev</span>
        `;

        Object.assign(indicator.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: 'rgba(255, 69, 0, 0.9)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: '999998',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        });

        document.body.appendChild(indicator);
    }

    updateIndicatorStatus(status) {
        const indicator = document.querySelector('.fanculo-dev-indicator');
        if (!indicator) return;

        const icon = indicator.querySelector('.indicator-icon');

        switch (status) {
            case 'connected':
                indicator.style.background = 'rgba(40, 167, 69, 0.9)';
                icon.textContent = '🔥';
                break;
            case 'polling':
                indicator.style.background = 'rgba(23, 162, 184, 0.9)';
                icon.textContent = '↻';
                break;
            case 'error':
                indicator.style.background = 'rgba(255, 193, 7, 0.9)';
                icon.textContent = '⚠️';
                break;
            case 'failed':
                indicator.style.background = 'rgba(220, 53, 69, 0.9)';
                icon.textContent = '❌';
                break;
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(40, 167, 69, 0.95);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 999999;
            font-family: sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.fanculoDevData) {
            window.frontendDevClient = new FrontendDevClient();
        }
    });
} else {
    if (window.fanculoDevData) {
        window.frontendDevClient = new FrontendDevClient();
    }
}

// Expose for debugging
window.FrontendDevClient = FrontendDevClient;