import React from 'react';
import { Input } from '../../ui';
import { PLACEHOLDER_TEXT } from '../../../constants/attributes.js';

/**
 * Component for managing attribute range settings (for range type)
 * @param {Object} props - Component props
 * @param {Object} props.range - Range object with max value
 * @param {number} props.attributeIndex - Index of the parent attribute
 * @param {Function} props.onUpdateRange - Callback to update range
 * @param {Function} props.onBlur - Callback for blur events
 * @returns {JSX.Element} AttributeRange component
 */
const AttributeRange = ({
    range,
    attributeIndex,
    onUpdateRange,
    onBlur
}) => {
    return (
        <div className="mt-2 ml-8 space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-highlight">
                    Range Settings
                </label>
            </div>

            <div className="mt-2">
                <label className="block text-xs text-contrast mb-1">
                    Max Value
                </label>
                <Input
                    type="number"
                    value={range?.max || 100}
                    onChange={(e) => onUpdateRange(attributeIndex, 'max', parseInt(e.target.value) || 100)}
                    onBlur={onBlur}
                    placeholder={PLACEHOLDER_TEXT.RANGE_MAX}
                    min="1"
                />
            </div>
        </div>
    );
};

export default AttributeRange;