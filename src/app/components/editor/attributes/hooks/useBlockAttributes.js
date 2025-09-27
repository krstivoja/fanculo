import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../../../utils';

/**
 * Custom hook for managing block attributes via API
 * @param {number} postId - The block post ID
 * @returns {Object} Attributes state and operations
 */
export const useBlockAttributes = (postId) => {
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    // Fetch attributes from API
    const fetchAttributes = useCallback(async () => {
        if (!postId) {
            setAttributes([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.request(`/block-attributes/${postId}`);

            if (response.success && response.data) {
                // Transform database format to frontend format
                const transformedAttributes = response.data.map(attr => ({
                    id: `attribute-${attr.id}`,
                    name: attr.attribute_name,
                    type: attr.attribute_type,
                    order: attr.attribute_order || 0,
                    label: attr.label || attr.attribute_name,
                    placeholder: attr.placeholder || '',
                    help: attr.help_text || '',
                    defaultValue: attr.default_value || '',
                    required: attr.required || false,
                    validationPattern: attr.validation_pattern || '',
                    ...(attr.options && { options: attr.options }),
                    ...(attr.max_value !== null && {
                        range: {
                            max: attr.max_value,
                            ...(attr.step_value !== null && { step: attr.step_value })
                        }
                    })
                }));

                setAttributes(transformedAttributes);
            } else {
                setAttributes([]);
            }
        } catch (err) {
            console.error('Failed to fetch attributes:', err);
            setError(err.message || 'Failed to load attributes');
            setAttributes([]);
        } finally {
            setLoading(false);
        }
    }, [postId]);

    // Save attributes to API
    const saveAttributes = useCallback(async (newAttributes) => {
        if (!postId) return false;

        try {
            setSaving(true);
            setError(null);

            // Transform frontend format to database format
            const transformedAttributes = newAttributes.map((attr, index) => ({
                name: attr.name,
                type: attr.type,
                order: attr.order !== undefined ? attr.order : index,
                ...(attr.label && { label: attr.label }),
                ...(attr.placeholder && { placeholder: attr.placeholder }),
                ...(attr.help && { help: attr.help }),
                ...(attr.defaultValue && { default_value: attr.defaultValue }),
                ...(attr.required && { required: attr.required }),
                ...(attr.validationPattern && { validation_pattern: attr.validationPattern }),
                ...(attr.options && { options: attr.options }),
                ...(attr.range && {
                    range: {
                        max: attr.range.max,
                        ...(attr.range.step && { step: attr.range.step })
                    }
                })
            }));

            // Use the simpler route that works
            const response = await apiClient.request(`/block-attributes/${postId}`, {
                method: 'POST',
                body: JSON.stringify({ attributes: transformedAttributes })
            });

            if (response.success) {
                // Update local state with saved data
                await fetchAttributes();
                return true;
            } else {
                throw new Error(response.message || 'Failed to save attributes');
            }
        } catch (err) {
            console.error('Failed to save attributes:', err);
            setError(err.message || 'Failed to save attributes');
            return false;
        } finally {
            setSaving(false);
        }
    }, [postId, fetchAttributes]);

    // Delete single attribute
    const deleteAttribute = useCallback(async (attributeId) => {
        if (!postId || !attributeId) return false;

        try {
            const numericId = attributeId.replace('attribute-', '');

            const response = await apiClient.request(`/blocks/${postId}/attributes/${numericId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                await fetchAttributes();
                return true;
            } else {
                throw new Error(response.message || 'Failed to delete attribute');
            }
        } catch (err) {
            console.error('Failed to delete attribute:', err);
            setError(err.message || 'Failed to delete attribute');
            return false;
        }
    }, [postId, fetchAttributes]);

    // Delete all attributes
    const deleteAllAttributes = useCallback(async () => {
        if (!postId) return false;

        try {
            const response = await apiClient.request(`/block-attributes/${postId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                setAttributes([]);
                return true;
            } else {
                throw new Error(response.message || 'Failed to delete all attributes');
            }
        } catch (err) {
            console.error('Failed to delete all attributes:', err);
            setError(err.message || 'Failed to delete all attributes');
            return false;
        }
    }, [postId]);

    // Load attributes on mount and when postId changes
    useEffect(() => {
        fetchAttributes();
    }, [fetchAttributes]);

    return {
        attributes,
        loading,
        error,
        saving,
        refetch: fetchAttributes,
        saveAttributes,
        deleteAttribute,
        deleteAllAttributes,
        setAttributes // For optimistic updates
    };
};