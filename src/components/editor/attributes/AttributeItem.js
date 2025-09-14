import React from 'react';
import { Button, Select, Input } from '../../ui';
import AttributeOptions from './AttributeOptions';
import AttributeRange from './AttributeRange';
import AttributeCodeExample from './AttributeCodeExample';
import {
    ATTRIBUTE_TYPES,
    PLACEHOLDER_TEXT,
    ARIA_LABELS,
} from '../../../constants/attributes.js';

/**
 * Component for rendering a single attribute item
 * @param {Object} props - Component props
 * @param {Object} props.attribute - Attribute object
 * @param {number} props.index - Index of the attribute
 * @param {Object} props.dragDropHandlers - Drag and drop handlers
 * @param {Object} props.operationHandlers - CRUD operation handlers
 * @param {Function} props.onBlur - Blur handler for form fields
 * @param {Object} props.dragDropState - Current drag/drop state
 * @returns {JSX.Element} AttributeItem component
 */
const AttributeItem = ({
    attribute,
    index,
    dragDropHandlers,
    operationHandlers,
    onBlur,
    dragDropState,
}) => {
    const { dragIndex, dropIndex } = dragDropState;
    const {
        handleDragStart,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
    } = dragDropHandlers;

    const {
        needsOptions,
        needsRange,
        updateAttribute,
        deleteAttribute,
        addOption,
        updateOption,
        deleteOption,
        updateRange,
    } = operationHandlers;

    const isDraggedOver = dropIndex === index && dragIndex !== index;
    const isAboveDragSource = dragIndex !== null && dragIndex !== index && dragIndex > index;
    const isBelowDragSource = dragIndex !== null && dragIndex !== index && dragIndex < index;

    // Class constants for different states
    const baseClasses = "attribute-row border border-gray-300 p-4 relative p-1 my-8 rounded-md bg-gray-50 flex gap-4 group";
    const draggedOverClasses = "attribute-row border-2 border-dashed border-blue-500 p-3 my-2 rounded-md bg-blue-50 relative group";
    const containerClass = isDraggedOver ? draggedOverClasses : baseClasses;

    return (
        <div
            key={attribute.id || index}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragLeave={(e) => handleDragLeave(e)}
            onDrop={(e) => handleDrop(e, index)}
            className={containerClass}
        >
            {/* Drop indicator above */}
            {isDraggedOver && isAboveDragSource && (
                <div className="absolute -left-2 -right-2 h-5 bg-blue-500 z-10 rounded-lg shadow-md -top-3"></div>
            )}

            {/* Drag handle */}
            <button
                type="button"
                draggable="true"
                aria-label={ARIA_LABELS.DRAG_TO_REORDER}
                className="components-button drag-handle cursor-move bg-gray-200 is-small has-icon"
                style={{ cursor: "move" }}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
            >
                <span className="dashicon dashicons dashicons-menu"></span>
            </button>

            {/* Main attribute controls */}
            <div className="flex-1">
                <div className="flex gap-4">
                    <div className="components-base-control css-qy3gpb ej5x27r4">
                        <div className="components-base-control__field css-1sf3vf3 ej5x27r3">
                            <select
                                className="components-select-control__input css-k4pu08 e1mv6sxx2"
                                value={attribute.type}
                                onChange={(e) => updateAttribute(index, "type", e.target.value)}
                                onBlur={onBlur}
                            >
                                {ATTRIBUTE_TYPES.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="components-base-control flex-1 css-qy3gpb ej5x27r4">
                        <div className="components-base-control__field css-1sf3vf3 ej5x27r3">
                            <input
                                className="components-text-control__input"
                                type="text"
                                value={attribute.name}
                                onChange={(e) => updateAttribute(index, "name", e.target.value)}
                                onBlur={onBlur}
                                placeholder={PLACEHOLDER_TEXT.ATTRIBUTE_NAME}
                            />
                        </div>
                    </div>
                </div>

                {/* Options section for select/radio types */}
                {needsOptions(attribute.type) && (
                    <AttributeOptions
                        options={attribute.options}
                        attributeIndex={index}
                        onAddOption={addOption}
                        onUpdateOption={updateOption}
                        onDeleteOption={deleteOption}
                        onBlur={onBlur}
                    />
                )}

                {/* Range section for range type */}
                {needsRange(attribute.type) && (
                    <AttributeRange
                        range={attribute.range}
                        attributeIndex={index}
                        onUpdateRange={updateRange}
                        onBlur={onBlur}
                    />
                )}

                {/* PHP code example */}
                <AttributeCodeExample
                    attribute={attribute}
                    attributeIndex={index}
                />
            </div>

            {/* Delete button */}
            <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 !hidden group-hover:!block bg-white border border-gray-300 hover:bg-red-700 rounded-full">
                <button
                    type="button"
                    aria-label={ARIA_LABELS.DELETE_ATTRIBUTE}
                    className="components-button attribute-delete-button hover:!text-white hover:[&_svg]:!fill-white hover:[&_svg]:!stroke-white !p-4 is-small has-icon"
                    onClick={(e) => {
                        e.preventDefault();
                        const attributeName = attribute.name || 'Unnamed attribute';
                        const confirmMessage = `Do you want to delete attribute "${attributeName}"?`;

                        if (window.confirm(confirmMessage)) {
                            deleteAttribute(e, index);
                        }
                    }}
                >
                    <span className="dashicon dashicons dashicons-trash" style={{ fontSize: '16px', width: '16px', height: '16px' }}></span>
                </button>
            </div>

            {/* Drop indicator below */}
            {isDraggedOver && isBelowDragSource && (
                <div className="absolute -left-2 -right-2 h-5 bg-blue-500 z-10 rounded-lg shadow-md -bottom-3"></div>
            )}
        </div>
    );
};

export default AttributeItem;