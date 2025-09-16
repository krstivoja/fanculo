import {
    ATTRIBUTE_TYPES_WITH_OPTIONS,
    ATTRIBUTE_TYPES_WITH_RANGE,
    DEFAULT_NEW_ATTRIBUTE,
    DEFAULT_ATTRIBUTE_OPTION,
    DEFAULT_ATTRIBUTE_RANGE
} from '../../../../constants/attributes.js';

/**
 * Custom hook for handling attribute CRUD operations
 * @param {Array} attributes - Current attributes array
 * @param {Function} onAttributesChange - Callback when attributes change
 * @returns {Object} CRUD operation functions
 */
export const useAttributeOperations = (attributes, onAttributesChange) => {
    const needsOptions = (type) => ATTRIBUTE_TYPES_WITH_OPTIONS.includes(type);
    const needsRange = (type) => ATTRIBUTE_TYPES_WITH_RANGE.includes(type);

    const addAttribute = (e) => {
        e?.preventDefault();
        e?.stopPropagation();

        const newOrder = attributes.length > 0 ? Math.max(...attributes.map(attr => attr.order || 0)) + 1 : 0;
        const newAttribute = {
            ...DEFAULT_NEW_ATTRIBUTE,
            id: `attribute-${Date.now()}`,
            order: newOrder,
            ...(needsOptions(DEFAULT_NEW_ATTRIBUTE.type) ? { options: [] } : {}),
            ...(needsRange(DEFAULT_NEW_ATTRIBUTE.type) ? { range: { ...DEFAULT_ATTRIBUTE_RANGE } } : {})
        };
        const newAttributes = [...attributes, newAttribute];
        onAttributesChange(newAttributes);
    };

    const updateAttribute = (index, field, value) => {
        const newAttributes = [...attributes];
        if (field === 'type') {
            const oldType = newAttributes[index].type;
            const newType = value;

            // Handle adding/removing options
            if (needsOptions(newType) && !needsOptions(oldType)) {
                newAttributes[index].options = [];
            } else if (needsOptions(oldType) && !needsOptions(newType)) {
                delete newAttributes[index].options;
            }

            // Handle adding/removing range
            if (needsRange(newType) && !needsRange(oldType)) {
                newAttributes[index].range = { ...DEFAULT_ATTRIBUTE_RANGE };
                // Remove options if they exist when switching to range
                if (newAttributes[index].options) {
                    delete newAttributes[index].options;
                }
            } else if (needsRange(oldType) && !needsRange(newType)) {
                delete newAttributes[index].range;
            }

            newAttributes[index].type = newType;
        } else {
            newAttributes[index][field] = value;
        }
        onAttributesChange(newAttributes);
    };

    const deleteAttribute = (e, index) => {
        e?.preventDefault();
        e?.stopPropagation();

        const newAttributes = attributes.filter((_, i) => i !== index);

        // Reorder remaining attributes to maintain sequential order
        newAttributes.forEach((attr, i) => {
            attr.order = i;
        });

        onAttributesChange(newAttributes);
    };

    const addOption = (e, attributeIndex) => {
        e?.preventDefault();
        e?.stopPropagation();

        const newAttributes = [...attributes];
        newAttributes[attributeIndex].options = [
            ...(newAttributes[attributeIndex].options || []),
            { ...DEFAULT_ATTRIBUTE_OPTION }
        ];
        onAttributesChange(newAttributes);
    };

    const updateOption = (attributeIndex, optionIndex, field, value) => {
        const newAttributes = [...attributes];
        newAttributes[attributeIndex].options[optionIndex][field] = value;
        onAttributesChange(newAttributes);
    };

    const deleteOption = (e, attributeIndex, optionIndex) => {
        e?.preventDefault();
        e?.stopPropagation();

        const newAttributes = [...attributes];
        newAttributes[attributeIndex].options = newAttributes[attributeIndex].options.filter(
            (_, i) => i !== optionIndex
        );
        onAttributesChange(newAttributes);
    };

    const updateRange = (attributeIndex, field, value) => {
        const newAttributes = [...attributes];
        if (!newAttributes[attributeIndex].range) {
            newAttributes[attributeIndex].range = { ...DEFAULT_ATTRIBUTE_RANGE };
        }
        newAttributes[attributeIndex].range[field] = value;
        onAttributesChange(newAttributes);
    };

    return {
        needsOptions,
        needsRange,
        addAttribute,
        updateAttribute,
        deleteAttribute,
        addOption,
        updateOption,
        deleteOption,
        updateRange
    };
};