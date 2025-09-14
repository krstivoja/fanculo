import { useState } from 'react';

/**
 * Custom hook for handling drag and drop functionality for attributes
 * @param {Array} attributes - Current attributes array
 * @param {Function} onAttributesChange - Callback when attributes change
 * @returns {Object} Drag and drop handlers and state
 */
export const useAttributeDragDrop = (attributes, onAttributesChange) => {
    const [dragIndex, setDragIndex] = useState(null);
    const [dropIndex, setDropIndex] = useState(null);

    const handleDragStart = (e, index) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index);

        // Add some styling to the drag image
        e.target.style.opacity = '0.5';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (dragIndex !== null && dragIndex !== index) {
            setDropIndex(index);
        }
    };

    const handleDragEnter = (e, index) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index) {
            setDropIndex(index);
        }
    };

    const handleDragLeave = (e) => {
        // Only clear dropIndex if we're actually leaving the drop zone
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setDropIndex(null);
        }
    };

    const handleDrop = (e, index) => {
        e.preventDefault();

        if (dragIndex !== null && dragIndex !== index) {
            const newAttributes = [...attributes];
            const draggedItem = newAttributes[dragIndex];

            // Remove the dragged item
            newAttributes.splice(dragIndex, 1);

            // Insert at new position
            const actualDropIndex = dragIndex < index ? index - 1 : index;
            newAttributes.splice(actualDropIndex, 0, draggedItem);

            // Update order field for all attributes
            newAttributes.forEach((attr, i) => {
                attr.order = i;
            });

            onAttributesChange(newAttributes);
        }

        setDragIndex(null);
        setDropIndex(null);
    };

    const handleDragEnd = (e) => {
        // Reset styling
        e.target.style.opacity = '1';
        setDragIndex(null);
        setDropIndex(null);
    };

    return {
        dragIndex,
        dropIndex,
        handleDragStart,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDrop,
        handleDragEnd
    };
};