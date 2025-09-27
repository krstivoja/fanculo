/**
 * Fanculo Development Mode Frontend Client
 * Handles hot reload functionality on the frontend
 */

(function() {
    'use strict';

    class FanculoFrontendReload {
        constructor() {
            this.useEventSource = window.EventSource && !this.isOldBrowser();
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 5;
            this.shouldReconnect = true;
            this.isConnected = false;

            this.initConnection();
            this.markBlocks();
            this.showDevIndicator();
        }

        isOldBrowser() {
            return !window.fetch || !window.Promise;
        }

        initConnection() {
            if (!this.shouldReconnect) {
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
                this.updateIndicatorStatus('connected');
                console.log('Fanculo Dev: Frontend connected to hot reload');
            });

            this.eventSource.addEventListener('block_updated', (e) => {
                const data = JSON.parse(e.data);
                this.updateBlockContent(data.data.slug, data.data.post_id || this.getPostId());
            });

            this.eventSource.addEventListener('styles_updated', (e) => {
                this.refreshStyles();
            });

            this.eventSource.addEventListener('error', (e) => {
                console.warn('Fanculo Dev: Frontend EventSource error', e);
                this.updateIndicatorStatus('error');
                this.handleReconnect();
            });

            this.eventSource.addEventListener('ping', () => {
                this.updateIndicatorStatus('connected');
            });

            this.eventSource.addEventListener('disconnected', (e) => {
                const payload = this.parseEventData(e.data);
                this.handleStreamDisconnect(payload);
            });
        }

        initLongPolling() {
            this.lastTimestamp = Date.now() / 1000;
            this.pollInterval = setInterval(() => this.poll(), 3000);
            console.log('Fanculo Dev: Frontend using long polling fallback');
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
                    this.updateIndicatorStatus('connected');
                }
            } catch (error) {
                this.updateIndicatorStatus('error');
                console.warn('Fanculo Dev: Frontend long polling failed:', error);
            }
        }

        handleEvent(type, data) {
            switch (type) {
                case 'block_updated':
                    this.updateBlockContent(data.slug, data.post_id || this.getPostId());
                    break;
                case 'styles_updated':
                    this.refreshStyles();
                    break;
                case 'error':
                    this.showError(`Generation error: ${data.message}`);
                    break;
            }
        }

        markBlocks() {
            // Enhanced block detection with multiple strategies
            const blockSelectors = [
                '[class*="wp-block-fanculo-"]',
                '[data-type*="fanculo/"]',
                '.fanculo-block'
            ];

            blockSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(block => {
                    const slug = this.extractSlugFromBlock(block);
                    if (slug) {
                        block.setAttribute('data-fanculo-block', slug);
                        block.setAttribute('data-fanculo-post-id', this.getPostId());
                        // Add visual indicator for dev mode
                        this.addBlockDevIndicator(block, slug);
                    }
                });
            });
        }

        extractSlugFromBlock(block) {
            // Try to extract slug from various sources
            const classNames = block.className.split(' ');

            // From wp-block-fanculo-{slug} class
            const fanculoClass = classNames.find(c => c.startsWith('wp-block-fanculo-'));
            if (fanculoClass) {
                return fanculoClass.replace('wp-block-fanculo-', '');
            }

            // From data-type attribute
            const dataType = block.getAttribute('data-type');
            if (dataType && dataType.startsWith('fanculo/')) {
                return dataType.replace('fanculo/', '');
            }

            // From custom data attribute
            const fanculoBlock = block.getAttribute('data-fanculo-block');
            if (fanculoBlock) {
                return fanculoBlock;
            }

            return null;
        }

        addBlockDevIndicator(block, slug) {
            // Add a small visual indicator for dev mode
            const indicator = document.createElement('div');
            indicator.className = 'fanculo-dev-block-indicator';
            indicator.textContent = `🔥 ${slug}`;
            indicator.title = `Fanculo block: ${slug} (Hot reload active)`;

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

            // Make sure the parent block has relative positioning
            const blockStyle = window.getComputedStyle(block);
            if (blockStyle.position === 'static') {
                block.style.position = 'relative';
            }

            block.appendChild(indicator);
        }

        async updateBlockContent(slug, postId) {
            const blocks = document.querySelectorAll(
                `[data-fanculo-block="${slug}"][data-fanculo-post-id="${postId}"]`
            );

            if (blocks.length === 0) {
                console.log(`No blocks found for slug: ${slug}`);
                return;
            }

            for (const block of blocks) {
                try {
                    const attributes = this.extractBlockAttributes(block);

                    const response = await fetch(fanculoDevData.blockHtmlUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-WP-Nonce': fanculoDevData.restNonce
                        },
                        body: JSON.stringify({
                            slug: slug,
                            post_id: postId,
                            attributes: attributes
                        })
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.data?.message || 'Block rendering failed');
                    }

                    const oldBlock = block;

                    // Create temporary container for new HTML
                    const temp = document.createElement('div');
                    temp.innerHTML = data.data.html;
                    const newBlock = temp.firstElementChild;

                    if (!newBlock) {
                        throw new Error('No content returned from server');
                    }

                    // Preserve dev indicator
                    const oldIndicator = oldBlock.querySelector('.fanculo-dev-block-indicator');

                    // Replace block and re-mark for future updates
                    oldBlock.parentNode.replaceChild(newBlock, oldBlock);

                    // Re-run marking for new content
                    this.markBlocks();

                    // Restore dev indicator if it existed
                    if (oldIndicator) {
                        const newIndicator = newBlock.querySelector('.fanculo-dev-block-indicator');
                        if (!newIndicator) {
                            this.addBlockDevIndicator(newBlock, slug);
                        }
                    }

                    this.showUpdateNotification(slug);

                } catch (error) {
                    console.warn(`Hot reload failed for block ${slug}:`, error);
                    this.showErrorNotification(slug, error);
                }
            }
        }

        extractBlockAttributes(block) {
            // Try to extract attributes from data attributes or other sources
            const attributes = {};

            // Check for data-* attributes that might contain block attributes
            Array.from(block.attributes).forEach(attr => {
                if (attr.name.startsWith('data-attr-')) {
                    const attrName = attr.name.replace('data-attr-', '');
                    attributes[attrName] = attr.value;
                }
            });

            // Check for specific attribute patterns
            const classList = block.className.split(' ');
            classList.forEach(className => {
                if (className.startsWith('has-') && className.endsWith('-color')) {
                    attributes.textColor = className.replace('has-', '').replace('-color', '');
                }
                if (className.startsWith('has-') && className.endsWith('-background-color')) {
                    attributes.backgroundColor = className.replace('has-', '').replace('-background-color', '');
                }
            });

            return attributes;
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

            this.showSuccessNotification('Styles refreshed');
        }

        getPostId() {
            // Try to get post ID from various sources
            if (window.wp?.data?.select('core/editor')?.getCurrentPostId) {
                return window.wp.data.select('core/editor').getCurrentPostId();
            }

            // From body class
            const bodyClasses = document.body.className.split(' ');
            const postIdClass = bodyClasses.find(c => c.startsWith('postid-'));
            if (postIdClass) {
                return parseInt(postIdClass.replace('postid-', ''));
            }

            // From meta tag
            const postIdMeta = document.querySelector('meta[name="post-id"]');
            if (postIdMeta) {
                return parseInt(postIdMeta.content);
            }

            // Default
            return 0;
        }

        handleStreamDisconnect(payload) {
            const reason = payload?.reason || 'unknown';

            switch (reason) {
                case 'dev_mode_off':
                    console.info('Fanculo Dev: Frontend hot reload disabled by server');
                    this.shouldReconnect = false;
                    this.closeConnections();
                    this.updateIndicatorStatus('disconnected');
                    break;
                case 'invalid_nonce':
                    console.warn('Fanculo Dev: Frontend stream nonce invalid');
                    this.shouldReconnect = false;
                    this.closeConnections();
                    this.updateIndicatorStatus('failed');
                    this.showError('Hot reload token expired – refresh the page');
                    break;
                case 'forbidden':
                    console.warn('Fanculo Dev: Frontend lacks permission for hot reload');
                    this.shouldReconnect = false;
                    this.closeConnections();
                    this.updateIndicatorStatus('failed');
                    this.showError('Hot reload unavailable – insufficient permissions');
                    break;
                default:
                    this.closeConnections();
                    this.updateIndicatorStatus('error');
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
                console.warn('Fanculo Dev: Frontend failed to parse stream payload', error);
                return null;
            }
        }

        closeConnections() {
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

        handleReconnect() {
            if (!this.shouldReconnect) {
                return;
            }

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Fanculo Dev: Frontend attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

                setTimeout(() => {
                    this.initConnection();
                }, 1000 * this.reconnectAttempts); // Exponential backoff
            } else {
                console.error('Fanculo Dev: Frontend max reconnection attempts reached');
                this.updateIndicatorStatus('failed');
            }
        }

        showDevIndicator() {
            // Create development mode indicator
            const indicator = document.createElement('div');
            indicator.className = 'fanculo-dev-frontend-indicator';
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
            const indicator = document.querySelector('.fanculo-dev-frontend-indicator');
            if (!indicator) return;

            const icon = indicator.querySelector('.indicator-icon');
            const text = indicator.querySelector('.indicator-text');

            switch (status) {
                case 'connected':
                    indicator.style.background = 'rgba(40, 167, 69, 0.9)';
                    icon.textContent = '🔥';
                    text.textContent = 'Dev';
                    break;
                case 'error':
                    indicator.style.background = 'rgba(255, 193, 7, 0.9)';
                    icon.textContent = '⚠️';
                    text.textContent = 'Dev';
                    break;
                case 'failed':
                    indicator.style.background = 'rgba(220, 53, 69, 0.9)';
                    icon.textContent = '❌';
                    text.textContent = 'Dev';
                    break;
                default:
                    indicator.style.background = 'rgba(108, 117, 125, 0.9)';
                    icon.textContent = '⏸';
                    text.textContent = 'Dev';
                    break;
            }
        }

        showUpdateNotification(slug) {
            this.showNotification(`Block "${slug}" updated`, 'success');
        }

        showErrorNotification(slug, error) {
            this.showNotification(`Block "${slug}" update failed: ${error.message}`, 'error');
        }

        showSuccessNotification(message) {
            this.showNotification(message, 'success');
        }

        showError(message) {
            this.showNotification(message, 'error');
        }

        showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = `fanculo-frontend-notification ${type}`;
            notification.textContent = message;

            Object.assign(notification.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: type === 'success' ? 'rgba(40, 167, 69, 0.95)' : 'rgba(220, 53, 69, 0.95)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                zIndex: '999999',
                fontFamily: 'sans-serif',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                maxWidth: '400px',
                textAlign: 'center'
            });

            document.body.appendChild(notification);

            // Auto remove
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (fanculoDevData) {
                window.fanculoFrontendReload = new FanculoFrontendReload();
            }
        });
    } else {
        // DOM already loaded
        if (fanculoDevData) {
            window.fanculoFrontendReload = new FanculoFrontendReload();
        }
    }

    // Expose class globally for debugging
    window.FanculoFrontendReload = FanculoFrontendReload;

})();
