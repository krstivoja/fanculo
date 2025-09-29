import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../../ui';
import { useAttributeOperations } from './hooks/useAttributeOperations';
import AttributeItem from './AttributeItem';
import {
    ATTRIBUTE_TYPES_WITH_OPTIONS,
    ATTRIBUTE_TYPES_WITH_RANGE,
    ATTRIBUTE_TYPES_WITHOUT_OPTIONS,
    DEFAULT_ATTRIBUTE_RANGE,
    BUTTON_TEXT,
    ERROR_MESSAGES
} from '../../../constants/attributes.js';

/**
 * Main AttributesManager component - orchestrates all attribute management functionality
 * @param {Object} props - Component props
 * @param {Object} props.blockMeta - Block metadata containing attributes
 * @param {Function} props.onMetaChange - Callback when metadata changes
 * @param {string} props.blockId - Block ID
 * @param {number} props.postId - Post ID
 * @returns {JSX.Element} AttributesManager component
 */
const AttributesManager = ({ blockMeta, onMetaChange, blockId, postId: propPostId }) => {
    // Get post ID from props or meta or current post
    const postId = useMemo(() => {
        // Use prop if provided
        if (propPostId) {
            return propPostId;
        }
        // Try to get from window object (WordPress editor context)
        if (typeof window !== 'undefined' && window.funculo_current_post_id) {
            return window.funculo_current_post_id;
        }
        // Try to get from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const postParam = urlParams.get('post');
        if (postParam) {
            return parseInt(postParam, 10);
        }
        return null;
    }, [propPostId]);


    const [localChanges, setLocalChanges] = useState(false);
    const [localAttributes, setLocalAttributes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Memoize expensive type checking functions
    const needsOptions = useCallback((type) => ATTRIBUTE_TYPES_WITH_OPTIONS.includes(type), []);
    const needsRange = useCallback((type) => ATTRIBUTE_TYPES_WITH_RANGE.includes(type), []);

    // Memoize parsed attributes to prevent repeated JSON parsing
    const parsedAttributes = useMemo(() => {
        if (!blockMeta?.attributes) {
            return [];
        }

        try {
            // Parse attributes from JSON if it's a string
            const parsed = typeof blockMeta.attributes === 'string'
                ? JSON.parse(blockMeta.attributes)
                : blockMeta.attributes;

            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Failed to parse attributes:', e);
            return [];
        }
    }, [blockMeta?.attributes]);

    // Initialize local attributes from memoized parsed attributes
    useEffect(() => {
        setLocalAttributes(parsedAttributes);
    }, [parsedAttributes]);

    // Memoize expensive update function to prevent recreation
    const updateParentStateWithAttributes = useCallback((newAttributes) => {
        setLocalAttributes(newAttributes);
        setLocalChanges(true);

        // Update parent meta - the parent component will handle saving when Save button is clicked
        // The attributes will be saved as JSON in meta, and also to the database table via the PHP save hook
        const attributesJson = JSON.stringify(newAttributes, null, 2);
        onMetaChange('blocks', 'attributes', attributesJson);
    }, [onMetaChange]);

    // No longer need to expose save function since attributes are saved with meta
    // The attributes are now saved via the main save process in PostsApiController::updatePostMeta

    // Initialize hooks with callbacks
    const operationHandlers = useAttributeOperations(localAttributes, updateParentStateWithAttributes);

    // Memoize empty handler for optimization
    const emptyBlurHandler = useCallback(() => {}, []);

    // Memoize the attributes list rendering to prevent expensive re-renders
    const attributesList = useMemo(() => {
        return localAttributes.map((attribute, index) => (
            <AttributeItem
                key={attribute.id || index}
                attribute={attribute}
                index={index}
                operationHandlers={operationHandlers}
                onBlur={emptyBlurHandler}
            />
        ));
    }, [localAttributes, operationHandlers, emptyBlurHandler]);

    // Memoize empty state to prevent recreation
    const emptyStateElement = useMemo(() => (
        localAttributes.length === 0 ? (
            <p className="text-contrast text-center py-8">
                No attributes defined. Click "Add attribute" to create one.
            </p>
        ) : null
    ), [localAttributes.length]);

    return (
        <div className="attributes-manager max-h-[calc(100vh-200px)] h-full overflow-y-auto flex flex-col">
            {/* Header with Add Attribute button */}
            <div className="flex justify-between items-center pb-4">
                <h3 className="text-lg font-medium text-highlight">Block Attributes</h3>
                <Button
                    variant="secondary"
                    onClick={operationHandlers.addAttribute}
                    className="add-attribute-button"
                >
                    {BUTTON_TEXT.ADD_ATTRIBUTE}
                </Button>
            </div>

            {/* Empty state */}
            {emptyStateElement}

            {/* Attributes list */}
            <div className="attribute-rows min-h-[100px] max-h-full overflow-y-auto overflow-x-hidden space-y-2">
                {attributesList}
            </div>
        </div>
    );
};

// Memoize the component to prevent expensive attribute rendering re-calculations
export default React.memo(AttributesManager, (prevProps, nextProps) => {
    // Custom comparison function for complex attribute rendering logic
    return (
        // Check if blockMeta.attributes (the expensive part) has changed
        prevProps.blockMeta?.attributes === nextProps.blockMeta?.attributes &&
        // Check if other blockMeta properties are the same
        prevProps.blockMeta === nextProps.blockMeta &&
        // Check if callback functions are the same reference
        prevProps.onMetaChange === nextProps.onMetaChange &&
        // Check if block and post IDs are the same
        prevProps.blockId === nextProps.blockId &&
        prevProps.postId === nextProps.postId
    );
});