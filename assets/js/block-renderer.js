/**
 * FanCoolo Block Renderer
 * Properly renders server-side content without adding extra wrapper divs
 * Includes security hardening and React key stability
 */

(function () {
  "use strict";

  // Use WordPress globals
  const { createElement, cloneElement } = wp.element;
  const { InnerBlocks } = wp.blockEditor;

  // Safe HTML tags allowlist for XSS prevention
  const SAFE_TAGS = [
    "div",
    "span",
    "p",
    "br",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "a",
    "img",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "sup",
    "sub",
    "del",
    "ins",
    "abbr",
    "cite",
    "q",
    "kbd",
    "samp",
    "var",
    "s",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "aside",
    "nav",
    "figure",
    "figcaption",
    "blockquote",
    "pre",
    "code",
    "table",
    "caption",
    "colgroup",
    "col",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "dl",
    "dt",
    "dd",
    "button",
    // Form elements
    "form",
    "label",
    "input",
    "textarea",
    "select",
    "option",
    "fieldset",
    "legend",
    "output",
    // Media elements
    "picture",
    "source",
    "video",
    "audio",
    "track",
    // SVG elements for icons
    "svg",
    "path",
    "circle",
    "rect",
    "line",
    "polygon",
    "polyline",
    "ellipse",
    "g",
    "defs",
    "use",
    "symbol",
    "marker",
    "clipPath",
    // Additional semantic elements
    "time",
    "address",
    "details",
    "summary",
    "mark",
    "small",
    "bdi",
    "bdo",
  ];

  // Safe attributes allowlist
  const SAFE_ATTRIBUTES = [
    "class",
    "id",
    "style",
    "title",
    "alt",
    "src",
    "srcset",
    "sizes",
    "href",
    "target",
    "rel",
    "download",
    "referrerpolicy",
    "loading",
    "decoding",
    "fetchpriority",
    "crossorigin",
    "data-*",
    "aria-*",
    "role",
    // Form attributes
    "action",
    "method",
    "type",
    "name",
    "value",
    "placeholder",
    "for",
    "autocomplete",
    "required",
    "disabled",
    "readonly",
    "checked",
    "selected",
    "multiple",
    "size",
    "maxlength",
    "minlength",
    "min",
    "max",
    "step",
    "pattern",
    "accept",
    "start",
    // Media attributes
    "controls",
    "autoplay",
    "loop",
    "muted",
    "playsinline",
    "preload",
    "poster",
    "currenttime",
    "volume",
    "track",
    // Table attributes
    "colspan",
    "rowspan",
    "scope",
    // SVG attributes
    "viewBox",
    "xmlns",
    "width",
    "height",
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "d",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "points",
    "transform",
    "opacity",
    // Additional semantic attributes
    "datetime",
    "open",
    "tabindex",
  ];

  /**
   * Generate stable, collision-free keys
   * @param {string} prefix - Key prefix
   * @param {string} path - Structural path for element
   * @returns {string} Unique key
   */
  function generateStableKey(prefix, path) {
    const normalizedPath =
      path === undefined || path === null || path === ""
        ? "root"
        : String(path);
    return `${prefix}-${normalizedPath}`;
  }

  /**
   * Build stable path notation for nested elements
   * @param {string} parentPath - Existing path string
   * @param {number} index - Child index within parent
   * @returns {string} Combined path
   */
  function buildChildPath(parentPath, index) {
    const childIndex = String(index);
    return parentPath ? `${parentPath}.${childIndex}` : childIndex;
  }

  /**
   * Check if tag is safe for rendering
   * @param {string} tagName - HTML tag name
   * @returns {boolean} Whether tag is safe
   */
  function isSafeTag(tagName) {
    return SAFE_TAGS.includes(tagName.toLowerCase());
  }

  /**
   * Check if attribute is safe
   * @param {string} attrName - Attribute name
   * @returns {boolean} Whether attribute is safe
   */
  function isSafeAttribute(attrName) {
    const name = attrName.toLowerCase();
    return SAFE_ATTRIBUTES.some((safe) => {
      if (safe.endsWith("*")) {
        return name.startsWith(safe.slice(0, -1));
      }
      return safe === name;
    });
  }

  /**
   * Parse and sanitize DOM attributes
   * @param {Element} domNode - DOM element
   * @returns {Object} Sanitized props object
   */
  function parseAttributes(domNode) {
    const props = {};

    for (const attr of domNode.attributes) {
      if (!isSafeAttribute(attr.name)) {
        continue; // Skip unsafe attributes
      }

      if (attr.name === "class") {
        props.className = attr.value;
      } else if (attr.name === "style") {
        // Convert inline style string to object with validation
        const styleObject = {};
        const styles = attr.value.split(";").filter(Boolean);

        for (const stylePair of styles) {
          const parts = stylePair.split(":");
          if (parts.length === 2) {
            const key = parts[0]
              .trim()
              .replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const value = parts[1].trim();

            // Basic style value validation
            if (key && value && !value.includes("javascript:")) {
              styleObject[key] = value;
            }
          }
        }
        if (Object.keys(styleObject).length > 0) {
          props.style = styleObject;
        }
      } else {
        // Handle boolean attributes
        if (attr.value === "" || attr.value === attr.name) {
          props[attr.name] = true;
        } else {
          props[attr.name] = attr.value;
        }
      }
    }

    return props;
  }

  // Expose improved renderer globally for FanCoolo blocks
  window.FanCooloBlockRenderer = {
    /**
     * Legacy method: Create a React component that replaces inserter placeholders with InnerBlocks
     * @deprecated Use renderServerContent instead for better performance and security
     * @param {string} serverContent - HTML content from server
     * @param {Object} blockProps - WordPress block props
     * @param {Object} options - Additional options (for InnerBlocks, etc.)
     * @returns {React.Element} Rendered React element
     */
    createServerContentRenderer: function (serverContent, blockProps, options) {
      options = options || {};

      if (!serverContent) {
        return createElement("div", blockProps);
      }

      // Use the improved renderServerContent method
      return this.renderServerContent(serverContent, blockProps, options);
    },
    /**
     * Parse HTML string and convert to React elements
     * @param {string} htmlString - HTML content to parse
     * @param {Object} options - Options for InnerBlocks parsing
     * @returns {Array} Array of React elements
     */
    parseServerContent: function (htmlString, options = {}) {
      if (!htmlString) return [];

      // Replace blockProps placeholder with a temporary marker
      const processedHtml = htmlString.replace(
        /blockProps/g,
        'data-fancoolo-block-props="true"'
      );

      const container = document.createElement("div");
      container.innerHTML = processedHtml.trim();

      const convertDomToReact = (domNode, path = "") => {
        if (domNode.nodeType === Node.ELEMENT_NODE) {
          const tagName = domNode.tagName.toLowerCase();

          // Security check: only allow safe tags
          if (!isSafeTag(tagName)) {
            return null; // Skip unsafe tags
          }

          // Handle <innerblocks /> tags
          if (tagName === "innerblocks") {
            const innerBlocksProps = {
              key: generateStableKey("innerblocks", path),
              allowedBlocks: options.allowedBlocks || null,
              template: options.template || [],
              templateLock: options.templateLock || false,
            };

            // Filter out unknown props for InnerBlocks
            const supportedProps = [
              "allowedBlocks",
              "template",
              "templateLock",
              "key",
            ];
            const filteredProps = Object.keys(innerBlocksProps)
              .filter((key) => supportedProps.includes(key))
              .reduce((obj, key) => {
                obj[key] = innerBlocksProps[key];
                return obj;
              }, {});

            return createElement(InnerBlocks, filteredProps);
          }

          // Handle <div class="fancoolo-block-inserter"> elements
          if (
            tagName === "div" &&
            domNode.classList &&
            domNode.classList.contains("fancoolo-block-inserter")
          ) {
            const innerBlocksProps = {
              key: generateStableKey("fancoolo-inserter", path),
              allowedBlocks: options.allowedBlocks || null,
              template: options.template || [],
              templateLock: options.templateLock || false,
            };

            // Filter out unknown props for InnerBlocks
            const supportedProps = [
              "allowedBlocks",
              "template",
              "templateLock",
              "key",
            ];
            const filteredProps = Object.keys(innerBlocksProps)
              .filter((key) => supportedProps.includes(key))
              .reduce((obj, key) => {
                obj[key] = innerBlocksProps[key];
                return obj;
              }, {});

            return createElement(InnerBlocks, filteredProps);
          }

          const children = [];
          domNode.childNodes.forEach((child, index) => {
            const childPath = buildChildPath(path, index);
            const element = convertDomToReact(child, childPath);
            if (element !== null) {
              children.push(element);
            }
          });

          // Use secure attribute parsing
          const props = parseAttributes(domNode);

          // Check if this element should receive blockProps
          const shouldApplyBlockProps = domNode.hasAttribute(
            "data-fancoolo-block-props"
          );
          if (shouldApplyBlockProps) {
            // Remove the marker attribute
            delete props["data-fancoolo-block-props"];
            // Mark this element to receive blockProps during rendering
            props["data-fancoolo-needs-block-props"] = true;
          }

          // Add stable key for this element
          props.key = generateStableKey(tagName, path);

          return createElement(tagName, props, ...children);
        } else if (domNode.nodeType === Node.TEXT_NODE) {
          return domNode.textContent;
        }
        return null;
      };

      const elements = [];
      container.childNodes.forEach((node, index) => {
        const element = convertDomToReact(node, String(index));
        if (element !== null) {
          elements.push(element);
        }
      });

      return elements;
    },

    /**
     * Render server content with proper blockProps application
     * @param {string|null} serverContent - HTML content from server (null if parsedElements provided)
     * @param {Object} blockProps - WordPress block props
     * @param {Object} options - Additional options (for InnerBlocks, etc.)
     * @param {Array} parsedElements - Pre-parsed elements (optional)
     * @returns {React.Element} Rendered React element
     */
    renderServerContent: function (
      serverContent,
      blockProps,
      options = {},
      parsedElements = null
    ) {
      // Use provided parsed elements or parse server content
      const elements =
        parsedElements ||
        (serverContent ? this.parseServerContent(serverContent, options) : []);

      if (elements.length === 0) {
        return createElement("div", blockProps);
      }

      if (elements.length === 1) {
        const element = elements[0];

        // Guard against text roots - only clone React elements
        if (typeof element === "object" && element && element.type) {
          // Check if this element needs blockProps applied
          const needsBlockProps =
            element.props && element.props["data-fancoolo-needs-block-props"];

          if (needsBlockProps) {
            // Apply blockProps to this specific element
            const mergedProps = { ...element.props, ...blockProps };

            // Remove the marker
            delete mergedProps["data-fancoolo-needs-block-props"];

            // Merge classNames properly
            if (element.props.className && blockProps.className) {
              mergedProps.className = `${element.props.className} ${blockProps.className}`;
            }

            // Merge styles properly
            if (element.props.style && blockProps.style) {
              mergedProps.style = {
                ...element.props.style,
                ...blockProps.style,
              };
            }

            return cloneElement(element, mergedProps);
          } else {
            // Legacy behavior: apply blockProps to root element
            const mergedProps = { ...blockProps };

            if (element.props) {
              // Merge classNames
              if (element.props.className && blockProps.className) {
                mergedProps.className = `${element.props.className} ${blockProps.className}`;
              } else if (element.props.className) {
                mergedProps.className = element.props.className;
              }

              // Merge styles
              if (element.props.style && blockProps.style) {
                mergedProps.style = {
                  ...element.props.style,
                  ...blockProps.style,
                };
              } else if (element.props.style) {
                mergedProps.style = element.props.style;
              }
            }

            return cloneElement(element, mergedProps);
          }
        } else {
          // For text nodes or invalid elements, wrap in div
          return createElement("div", blockProps, element);
        }
      } else {
        // Check if any element needs blockProps, otherwise apply to wrapper
        const elementsWithBlockProps = this.applyBlockPropsToMarkedElements(
          elements,
          blockProps
        );
        const hasBlockPropsElements = elementsWithBlockProps.some(
          (el) =>
            el &&
            typeof el === "object" &&
            el.props &&
            el.props["data-had-block-props"]
        );

        if (hasBlockPropsElements) {
          // Don't wrap in div if elements handle their own blockProps
          return createElement("div", {}, ...elementsWithBlockProps);
        } else {
          // Legacy behavior: wrap in div with blockProps
          return createElement("div", blockProps, ...elementsWithBlockProps);
        }
      }
    },

    /**
     * Apply blockProps to elements that are marked with data-fancoolo-needs-block-props
     * @param {Array} elements - Array of React elements
     * @param {Object} blockProps - WordPress block props
     * @returns {Array} Elements with blockProps applied
     */
    applyBlockPropsToMarkedElements: function (elements, blockProps) {
      return elements.map((element) => {
        if (
          typeof element === "object" &&
          element &&
          element.type &&
          element.props
        ) {
          const needsBlockProps =
            element.props["data-fancoolo-needs-block-props"];

          if (needsBlockProps) {
            // Apply blockProps to this specific element
            const mergedProps = { ...element.props, ...blockProps };

            // Remove the marker and add completion marker
            delete mergedProps["data-fancoolo-needs-block-props"];
            mergedProps["data-had-block-props"] = true;

            // Merge classNames properly
            if (element.props.className && blockProps.className) {
              mergedProps.className = `${element.props.className} ${blockProps.className}`;
            }

            // Merge styles properly
            if (element.props.style && blockProps.style) {
              mergedProps.style = {
                ...element.props.style,
                ...blockProps.style,
              };
            }

            return cloneElement(element, mergedProps);
          }
        }
        return element;
      });
    },

    /**
     * Create a server-side render component for a block
     * @param {string} blockName - Block name (e.g., 'fancoolo/my-block')
     * @param {Object} parserOptions - Options for InnerBlocks parsing
     * @returns {Function} React component function
     */
    createServerRenderComponent: function (blockName, parserOptions = {}) {
      const { useState, useEffect, useMemo, useRef } = wp.element;
      const { useBlockProps } = wp.blockEditor;
      const { Spinner } = wp.components;

      return function ServerRenderComponent(props) {
        const { attributes } = props;
        const [serverContent, setServerContent] = useState("");
        const [isLoading, setIsLoading] = useState(true);
        const abortControllerRef = useRef(null);
        const attributesStringRef = useRef("");

        // Debounced attributes serialization
        const attributesString = useMemo(() => {
          return JSON.stringify(attributes);
        }, [attributes]);

        useEffect(() => {
          // Skip if attributes haven't actually changed (debounce)
          if (attributesString === attributesStringRef.current) {
            return;
          }
          attributesStringRef.current = attributesString;

          // Abort previous request if still pending
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }

          // Create new AbortController for this request
          const abortController = new AbortController();
          abortControllerRef.current = abortController;

          const postId = wp.data.select("core/editor").getCurrentPostId() || 0;

          setIsLoading(true);

          wp.apiFetch({
            path: `/wp/v2/block-renderer/${blockName}?context=edit`,
            method: "POST",
            data: {
              attributes: attributes,
              post_id: postId,
            },
            signal: abortController.signal,
          })
            .then((response) => {
              // Only update state if component is still mounted and request wasn't aborted
              if (!abortController.signal.aborted) {
                setServerContent(response.rendered);
                setIsLoading(false);
              }
            })
            .catch((error) => {
              // Only handle errors if request wasn't aborted
              if (!abortController.signal.aborted) {
                console.error(`Block render error for ${blockName}:`, error);
                setServerContent("<div><!-- Block render error --></div>");
                setIsLoading(false);
              }
            });

          // Cleanup function
          return () => {
            if (abortController) {
              abortController.abort();
            }
          };
        }, [attributesString]); // Use attributesString instead of JSON.stringify(attributes)

        const blockProps = useBlockProps();

        // Memoize parsed content without blockProps to avoid pointless re-parses
        const parsedContent = useMemo(() => {
          if (!serverContent) return null;

          return window.FanCooloBlockRenderer.parseServerContent(
            serverContent,
            parserOptions
          );
        }, [serverContent, parserOptions]);

        // Apply blockProps to parsed content
        const renderedContent = useMemo(() => {
          if (!parsedContent) return null;

          return window.FanCooloBlockRenderer.renderServerContent(
            null, // We already have parsed content
            blockProps,
            {},
            parsedContent // Pass parsed content directly
          );
        }, [parsedContent, blockProps]);

        if (!renderedContent) {
          return createElement("div", blockProps, createElement(Spinner));
        }

        return renderedContent;
      };
    },
  };

  // Legacy compatibility aliases (remove these in future versions)
  window.FanCooloInnerBlocksParser = {
    createServerContentRenderer: function (serverContent, blockProps, options) {
      return window.FanCooloBlockRenderer.createServerContentRenderer(
        serverContent,
        blockProps,
        options
      );
    },
  };

  // For backward compatibility
  window.NativeBlocksParser = window.FanCooloInnerBlocksParser;
})();
