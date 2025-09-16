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
 * @param {Object} props.operationHandlers - CRUD operation handlers
 * @param {Function} props.onBlur - Blur handler for form fields
 * @returns {JSX.Element} AttributeItem component
 */
const AttributeItem = ({
    attribute,
    index,
    operationHandlers,
    onBlur,
}) => {

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

    return (
        <div
            key={attribute.id || index}
            className="attribute-row border border-outline p-4 relative p-1 my-8 rounded-md flex gap-4 group"
        >

            {/* Main attribute controls */}
            <div className="flex-1">
                <div className="flex gap-4 w-full">
                        <Select
                            className='!max-w-[120px]'
                            value={attribute.type}
                            onChange={(e) => updateAttribute(index, "type", e.target.value)}
                            onBlur={onBlur}
                            options={ATTRIBUTE_TYPES}
                        />

                        <Input
                            type="text"
                            value={attribute.name}
                            onChange={(e) => updateAttribute(index, "name", e.target.value)}
                            onBlur={onBlur}
                            placeholder={PLACEHOLDER_TEXT.ATTRIBUTE_NAME}
                        />
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
            <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 !hidden group-hover:!block bg-white border border-outline hover:bg-red-700 rounded-full">
                <Button
                    variant="ghost"
                    aria-label={ARIA_LABELS.DELETE_ATTRIBUTE}
                    className="!text-red-600 hover:!text-white !p-2 rounded-full"
                    onClick={(e) => {
                        e.preventDefault();
                        const attributeName = attribute.name || 'Unnamed attribute';
                        const confirmMessage = `Do you want to delete attribute "${attributeName}"?`;

                        if (window.confirm(confirmMessage)) {
                            deleteAttribute(e, index);
                        }
                    }}
                >
                    ×
                </Button>
            </div>

        </div>
    );
};

export default AttributeItem;