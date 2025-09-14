import React, { useState, useEffect } from 'react';
import { Button } from '../../ui';
import { useAttributeDragDrop } from './hooks/useAttributeDragDrop';
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
 * @returns {JSX.Element} AttributesManager component
 */
const AttributesManager = ({ blockMeta, onMetaChange, blockId }) => {
    const [attributes, setAttributes] = useState([]);
    const [localChanges, setLocalChanges] = useState(false);

    const needsOptions = (type) => ATTRIBUTE_TYPES_WITH_OPTIONS.includes(type);
    const needsRange = (type) => ATTRIBUTE_TYPES_WITH_RANGE.includes(type);

    // Parse attributes from block meta on change
    useEffect(() => {
        try {
            let attributesData = [];
            if (blockMeta?.blocks?.attributes) {
                try {
                    attributesData = JSON.parse(blockMeta.blocks.attributes);
                    attributesData = attributesData.map((attr, index) => {
                        // Ensure each attribute has an order field for explicit ordering
                        const processedAttr = { ...attr };
                        if (typeof processedAttr.order === 'undefined') {
                            processedAttr.order = index;
                        }

                        if (needsOptions(processedAttr.type) && processedAttr.options) {
                            let parsedOptions = [];
                            if (typeof processedAttr.options === 'string') {
                                parsedOptions = processedAttr.options
                                    .split('\n')
                                    .filter(option => option.trim())
                                    .map(option => ({
                                        label: option.trim(),
                                        value: option.trim().toLowerCase().replace(/\s+/g, '-')
                                    }));
                            } else if (Array.isArray(processedAttr.options)) {
                                parsedOptions = processedAttr.options.map(option => {
                                    if (typeof option === 'string') {
                                        return {
                                            label: option,
                                            value: option.toLowerCase().replace(/\s+/g, '-')
                                        };
                                    }
                                    return {
                                        label: option.label || '',
                                        value: option.value || ''
                                    };
                                });
                            }
                            return { ...processedAttr, options: parsedOptions };
                        }

                        // Handle range attributes - ensure they have default range values if none exist
                        if (needsRange(processedAttr.type)) {
                            if (!processedAttr.range) {
                                processedAttr.range = { ...DEFAULT_ATTRIBUTE_RANGE };
                            }
                            // Remove options property if it exists on range attributes
                            if (processedAttr.options) {
                                delete processedAttr.options;
                            }
                            // Remove min property since we always use 0
                            if (processedAttr.range && processedAttr.range.min !== undefined) {
                                delete processedAttr.range.min;
                            }
                            return processedAttr;
                        }

                        // Clean up attributes that shouldn't have options
                        if (ATTRIBUTE_TYPES_WITHOUT_OPTIONS.includes(processedAttr.type) && processedAttr.options) {
                            delete processedAttr.options;
                        }

                        return processedAttr;
                    });

                    // Sort attributes by order field to ensure consistent ordering
                    attributesData.sort((a, b) => (a.order || 0) - (b.order || 0));
                } catch (e) {
                    console.error(ERROR_MESSAGES.ATTRIBUTE_PARSE_ERROR, e);
                }
            }
            setAttributes(Array.isArray(attributesData) ? attributesData : []);
        } catch (error) {
            console.error(ERROR_MESSAGES.GENERAL_ATTRIBUTE_ERROR, error);
            setAttributes([]);
        }
    }, [blockMeta?.blocks?.attributes]);

    // Update parent state with new attributes
    const updateParentState = () => {
        const attributesJson = JSON.stringify(attributes, null, 2);
        onMetaChange('blocks', 'attributes', attributesJson);
        setLocalChanges(false);
    };

    const updateParentStateWithAttributes = (newAttributes) => {
        setAttributes(newAttributes);
        const attributesJson = JSON.stringify(newAttributes, null, 2);
        onMetaChange('blocks', 'attributes', attributesJson);
        setLocalChanges(false);
    };

    // Initialize hooks with callbacks
    const dragDropHandlers = useAttributeDragDrop(attributes, updateParentStateWithAttributes);
    const operationHandlers = useAttributeOperations(attributes, updateParentStateWithAttributes);

    // Handle blur events to save changes
    useEffect(() => {
        const handleBlur = () => {
            if (localChanges) {
                updateParentState();
            }
        };
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('blur', handleBlur);
        };
    }, [localChanges, attributes]);

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
            {attributes.length === 0 && (
                <p className="text-contrast text-center py-8">
                    No attributes defined. Click "Add attribute" to create one.
                </p>
            )}

            {/* Attributes list */}
            <div className="attribute-rows min-h-[100px] max-h-full overflow-y-auto overflow-x-hidden space-y-2">
                {attributes.map((attribute, index) => (
                    <AttributeItem
                        key={attribute.id || index}
                        attribute={attribute}
                        index={index}
                        dragDropHandlers={dragDropHandlers}
                        operationHandlers={operationHandlers}
                        onBlur={updateParentState}
                        dragDropState={{
                            dragIndex: dragDropHandlers.dragIndex,
                            dropIndex: dragDropHandlers.dropIndex
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default AttributesManager;