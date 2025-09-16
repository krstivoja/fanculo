import React from 'react';
import { Button, Input } from '../../ui';
import {
    PLACEHOLDER_TEXT,
    BUTTON_TEXT,
    ARIA_LABELS
} from '../../../constants/attributes.js';

/**
 * Component for managing attribute options (for select/radio types)
 * @param {Object} props - Component props
 * @param {Array} props.options - Array of option objects
 * @param {number} props.attributeIndex - Index of the parent attribute
 * @param {Function} props.onAddOption - Callback to add new option
 * @param {Function} props.onUpdateOption - Callback to update option
 * @param {Function} props.onDeleteOption - Callback to delete option
 * @param {Function} props.onBlur - Callback for blur events
 * @returns {JSX.Element} AttributeOptions component
 */
const AttributeOptions = ({
    options,
    attributeIndex,
    onAddOption,
    onUpdateOption,
    onDeleteOption,
    onBlur
}) => {
    return (
        <div className="mt-2 ml-8 space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-highlight">
                    Options
                </label>
                <Button
                    variant="secondary"
                    onClick={(e) => onAddOption(e, attributeIndex)}
                    className="text-xs px-2 py-1"
                >
                    {BUTTON_TEXT.ADD_OPTION}
                </Button>
            </div>

            {(!options || options.length === 0) && (
                <p className="text-sm text-contrast">
                    No options defined. Click "Add Option" to create one.
                </p>
            )}

            {options && options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex gap-2 items-center">
                    <div className="flex-1">
                        <Input
                            type="text"
                            value={option.label}
                            onChange={(e) => onUpdateOption(attributeIndex, optionIndex, 'label', e.target.value)}
                            onBlur={onBlur}
                            placeholder={PLACEHOLDER_TEXT.OPTION_LABEL}
                        />
                    </div>
                    <div className="flex-1">
                        <Input
                            type="text"
                            value={option.value}
                            onChange={(e) => onUpdateOption(attributeIndex, optionIndex, 'value', e.target.value)}
                            onBlur={onBlur}
                            placeholder={PLACEHOLDER_TEXT.OPTION_VALUE}
                        />
                    </div>
                    <div>
                        <Button
                            variant="ghost"
                            onClick={(e) => onDeleteOption(e, attributeIndex, optionIndex)}
                            className="!text-red-600 hover:!bg-red-50 px-2 py-1"
                            aria-label={ARIA_LABELS.DELETE_OPTION}
                        >
                            ×
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AttributeOptions;