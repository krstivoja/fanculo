import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ReactTags } from '../ui';
import { apiClient } from '../../../utils';
import centralizedApi from '../../../utils/api/CentralizedApiService';

const ScssPartialsManager = ({ selectedPost, metaData, onMetaChange, mode = 'style', hideGlobalPartials = false, sharedData, dataLoading }) => {
  const [selectedPartials, setSelectedPartials] = useState([]);

  // Get partials data from shared data (no API call needed)
  const globalPartials = sharedData?.scssPartials?.global_partials || [];
  const availablePartials = sharedData?.scssPartials?.available_partials || [];
  const loading = dataLoading?.scssPartials || false;

  // Memoize field name based on mode to prevent recalculation
  const fieldName = useMemo(() => {
    return mode === 'editorStyle' ? 'editor_selected_partials' : 'selected_partials';
  }, [mode]);

  // Load selected partials when data is available
  useEffect(() => {
    if (selectedPost?.id && !loading && availablePartials.length >= 0) {
      loadSelectedPartials();
    }
  }, [selectedPost?.id, loading, availablePartials, globalPartials]);

  // Memoize expensive selected partials processing
  const processSelectedPartials = useMemo(() => {
    const blockSelectedPartials = metaData?.blocks?.[fieldName];
    console.log('Block selected partials raw:', blockSelectedPartials);

    if (!blockSelectedPartials) {
      console.log('No selected partials found in metaData');
      return [];
    }

    try {
      const parsed = typeof blockSelectedPartials === 'string'
        ? JSON.parse(blockSelectedPartials)
        : blockSelectedPartials;
      console.log('Parsed selected partials:', parsed);

      // If we have an array of IDs, convert them to objects with partial data
      if (Array.isArray(parsed)) {
        const allPartials = [...availablePartials, ...globalPartials];
        return parsed.map(item => {
          // If it's just an ID, find the partial data
          if (typeof item === 'number' || typeof item === 'string') {
            const partialId = typeof item === 'string' ? parseInt(item) : item;
            // Find this partial in available or global partials
            const foundPartial = allPartials.find(p => p.id === partialId);
            if (foundPartial) {
              return {
                id: foundPartial.id,
                slug: foundPartial.slug,
                title: foundPartial.title,
                order: parsed.indexOf(item) + 1
              };
            }
            // If not found, just store the ID
            return { id: partialId, title: `Partial ${partialId}`, order: parsed.indexOf(item) + 1 };
          }
          // If it's already an object, use it as-is
          return item;
        });
      }
    } catch (e) {
      console.error('Error parsing selected partials:', e);
    }

    return [];
  }, [metaData?.blocks, fieldName, availablePartials, globalPartials]);

  const loadSelectedPartials = useCallback(() => {
    // Load selected partials from metaData based on mode
    console.log('Loading selected partials from metaData:', metaData, 'mode:', mode);
    setSelectedPartials(processSelectedPartials);
  }, [processSelectedPartials, metaData, mode]);

  // Memoize expensive update function
  const updateSelectedPartials = useCallback((newSelected) => {
    console.log('Updating selected partials:', newSelected, 'mode:', mode);
    // Extract just the IDs for database storage
    const partialIds = newSelected.map(p => p.id || p);
    console.log('Calling onMetaChange with partial IDs:', partialIds, 'field:', fieldName);
    setSelectedPartials(newSelected);
    onMetaChange('blocks', fieldName, JSON.stringify(partialIds));
  }, [mode, fieldName, onMetaChange]);

  // Memoize expensive tag formatting
  const selectedTags = useMemo(() => {
    return selectedPartials.map(partial => ({
      id: partial.id,
      text: partial.title || partial.text || `Partial ${partial.id}`
    }));
  }, [selectedPartials]);

  // Memoize expensive suggestions processing
  const suggestions = useMemo(() => {
    return availablePartials
      .filter(partial => !selectedPartials.some(selected => selected.id === partial.id))
      .map(partial => ({
        id: partial.id,
        text: partial.title
      }));
  }, [availablePartials, selectedPartials]);

  // Memoize event handlers for tag operations
  const handleDelete = useCallback((tagIndex) => {
    const newSelected = selectedPartials.filter((_, index) => index !== tagIndex);
    updateSelectedPartials(newSelected.map((p, index) => ({ ...p, order: index + 1 })));
  }, [selectedPartials, updateSelectedPartials]);

  const handleAddition = useCallback((tag) => {
    // Find the full partial data from available partials
    const fullPartial = availablePartials.find(p => p.id === tag.id);
    if (fullPartial) {
      const newPartial = {
        id: fullPartial.id,
        slug: fullPartial.slug,
        title: fullPartial.title,
        order: selectedPartials.length + 1
      };
      updateSelectedPartials([...selectedPartials, newPartial]);
    }
  }, [availablePartials, selectedPartials, updateSelectedPartials]);

  const handleDrag = useCallback((tag, currPos, newPos) => {
    const newSelected = [...selectedPartials];
    const [movedItem] = newSelected.splice(currPos, 1);
    newSelected.splice(newPos, 0, movedItem);

    // Update order numbers
    const reordered = newSelected.map((p, index) => ({ ...p, order: index + 1 }));
    updateSelectedPartials(reordered);
  }, [selectedPartials, updateSelectedPartials]);

  // Memoize expensive global partials list rendering
  const globalPartialsList = useMemo(() => {
    if (hideGlobalPartials || globalPartials.length === 0) {
      return null;
    }

    return (
      <div className="mb-6">
        <h4 className="font-medium text-highlight mb-3 flex items-center gap-2">
          🌍 Global Partials
          <span className="text-xs bg-action text-white px-2 py-1 rounded">Auto-included</span>
        </h4>
        <div className="space-y-2">
          {globalPartials.map((partial) => (
            <div
              key={partial.id}
              className="flex items-center gap-3 p-3 bg-base-2 border border-outline rounded opacity-75"
            >
              <span className="flex-1 text-sm">{partial.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [hideGlobalPartials, globalPartials]);

  // Memoize status text
  const statusText = useMemo(() => {
    if (selectedPartials.length > 0) {
      return `${selectedPartials.length} partial${selectedPartials.length !== 1 ? 's' : ''} selected`;
    }
    return 'No partials selected. Type to search and add partials.';
  }, [selectedPartials.length]);

  // Memoize warning text
  const warningElement = useMemo(() => {
    if (availablePartials.length === 0 && !loading) {
      return (
        <p className="text-xs text-warning mt-2">
          No SCSS partials available. Create SCSS partial posts first.
        </p>
      );
    }
    return null;
  }, [availablePartials.length, loading]);

  if (loading) {
    return <div className="p-4 text-center text-contrast">Loading partials...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Global Partials Section - memoized */}
      {globalPartialsList}

      {/* Selected Partials Section using ReactTags */}
      <div className="flex-1">
        {!hideGlobalPartials && (
          <label className="block text-sm font-medium text-contrast mb-2">
            {mode === 'editorStyle' ? 'Editor Style Partials' : 'Selected Partials'}
          </label>
        )}

        <ReactTags
          tags={selectedTags}
          suggestions={suggestions}
          handleDelete={handleDelete}
          handleAddition={handleAddition}
          handleDrag={handleDrag}
          placeholder="Type a partial name and press Enter..."
        />

        <p className="text-xs text-contrast mt-2">
          {statusText}
        </p>

        {warningElement}
      </div>
    </div>
  );
};

// Memoize the component to prevent expensive SCSS partials list processing re-renders
export default React.memo(ScssPartialsManager, (prevProps, nextProps) => {
  // Custom comparison function for SCSS partials list processing
  return (
    // Check if selectedPost is the same
    prevProps.selectedPost?.id === nextProps.selectedPost?.id &&
    // Check if metaData reference is the same (most critical for expensive processing)
    prevProps.metaData === nextProps.metaData &&
    // Check if mode-specific fields have changed (the expensive parts)
    prevProps.metaData?.blocks?.selected_partials === nextProps.metaData?.blocks?.selected_partials &&
    prevProps.metaData?.blocks?.editor_selected_partials === nextProps.metaData?.blocks?.editor_selected_partials &&
    // Check if callback function reference is the same
    prevProps.onMetaChange === nextProps.onMetaChange &&
    // Check if configuration props are the same
    prevProps.mode === nextProps.mode &&
    prevProps.hideGlobalPartials === nextProps.hideGlobalPartials
  );
});