/**
 * Simple InnerBlocks inserter replacement utility
 * Uses WordPress globals - no compilation needed
 */

(function() {
	'use strict';

	// Use WordPress globals
	const { createElement } = wp.element;
	const { InnerBlocks } = wp.blockEditor;

	// Expose simple parser globally
	window.NativeBlocksParser = {
		/**
		 * Create a React component that replaces inserter placeholders with InnerBlocks
		 */
		createServerContentRenderer: function(serverContent, blockProps, options) {
			options = options || {};

			if (!serverContent) {
				return createElement('div', blockProps);
			}

			// Debug logging
			console.log('NativeBlocksParser: Processing content:', serverContent);

			// Quick check if content contains inserter placeholders
			if (serverContent.indexOf('fanculo-block-inserter') === -1) {
				console.log('NativeBlocksParser: No fanculo-block-inserter found, rendering as-is');
				// No placeholders - render server content as-is
				return createElement('div', Object.assign({}, blockProps, {
					dangerouslySetInnerHTML: { __html: serverContent }
				}));
			}

			console.log('NativeBlocksParser: Found fanculo-block-inserter, processing...');

			// Parse HTML content
			const temp = document.createElement('div');
			temp.innerHTML = serverContent;

			// Find the wrapper element (try wp-block- first, then fallback to first div)
			let wrapper = temp.querySelector('[class*="wp-block-"]');
			if (!wrapper) {
				wrapper = temp.querySelector('div');
			}
			if (!wrapper) {
				return createElement('div', Object.assign({}, blockProps, {
					dangerouslySetInnerHTML: { __html: serverContent }
				}));
			}

			// Convert wrapper content to React elements
			const elements = this._convertToReact(wrapper, options);

			// Return wrapper with converted elements
			const props = Object.assign({}, blockProps, { className: wrapper.className });
			return createElement.apply(null, ['div', props].concat(elements));
		},

		/**
		 * Convert DOM nodes to React elements, replacing inserter placeholders
		 */
		_convertToReact: function(container, options) {
			const elements = [];

			for (let i = 0; i < container.childNodes.length; i++) {
				const node = container.childNodes[i];
				const element = this._nodeToReact(node, i, options);

				if (element !== null) {
					elements.push(element);
				}
			}

			return elements;
		},

		/**
		 * Convert a single DOM node to React element
		 */
		_nodeToReact: function(node, index, options) {
			// Handle element nodes
			if (node.nodeType === Node.ELEMENT_NODE) {
				// Check if this is our inserter placeholder
				if (node.classList && node.classList.contains('fanculo-block-inserter')) {
					console.log('NativeBlocksParser: Replacing fanculo-block-inserter with InnerBlocks component');
					// Replace with InnerBlocks component
					const innerBlocksProps = Object.assign({ key: 'innerblocks-' + index }, options);
					return createElement(InnerBlocks, innerBlocksProps);
				}

				// Regular element - convert to React element
				const tagName = node.tagName.toLowerCase();
				const props = { key: tagName + '-' + index };

				// Convert attributes
				for (let i = 0; i < node.attributes.length; i++) {
					const attr = node.attributes[i];
					if (attr.name === 'class') {
						props.className = attr.value;
					} else {
						props[attr.name] = attr.value;
					}
				}

				// Convert children recursively
				const children = this._convertToReact(node, options);

				// Use apply to pass children as separate arguments
				return createElement.apply(null, [tagName, props].concat(children));
			}

			// Handle text nodes
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent.trim();
				return text || null;
			}

			// Ignore other node types
			return null;
		}
	};

})();