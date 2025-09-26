import React, { useState, useEffect } from 'react';
import { ReactTags } from '../ui';
import { apiClient } from '../../../utils';

const ScssPartialsManager = ({ selectedPost, metaData, onMetaChange }) => {
  const [globalPartials, setGlobalPartials] = useState([]);
  const [availablePartials, setAvailablePartials] = useState([]);
  const [selectedPartials, setSelectedPartials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load partials data on component mount
  useEffect(() => {
    if (selectedPost?.id) {
      loadPartials();
    }
  }, [selectedPost?.id]);

  // Load selected partials after global/available partials are loaded
  useEffect(() => {
    if (selectedPost?.id && !loading) {
      loadSelectedPartials();
    }
  }, [selectedPost?.id, globalPartials, availablePartials, loading]);

  const loadPartials = async () => {
    try {
      const data = await apiClient.getScssPartials();
      console.log('SCSS Partials API Response:', data);
      setGlobalPartials(data.global_partials || []);
      setAvailablePartials(data.available_partials || []);
      console.log('Global partials set:', data.global_partials || []);
      console.log('Available partials set:', data.available_partials || []);
    } catch (error) {
      console.error('Error loading partials:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedPartials = () => {
    // Load selected partials from metaData
    console.log('Loading selected partials from metaData:', metaData);
    const blockSelectedPartials = metaData?.blocks?.selected_partials;
    console.log('Block selected partials raw:', blockSelectedPartials);

    if (blockSelectedPartials) {
      try {
        const parsed = typeof blockSelectedPartials === 'string'
          ? JSON.parse(blockSelectedPartials)
          : blockSelectedPartials;
        console.log('Parsed selected partials:', parsed);

        // If we have an array of IDs, convert them to objects with partial data
        if (Array.isArray(parsed)) {
          const partialsWithData = parsed.map(item => {
            // If it's just an ID, find the partial data
            if (typeof item === 'number' || typeof item === 'string') {
              const partialId = typeof item === 'string' ? parseInt(item) : item;
              // Find this partial in available or global partials
              const foundPartial = [...availablePartials, ...globalPartials].find(p => p.id === partialId);
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
          setSelectedPartials(partialsWithData);
        } else {
          setSelectedPartials([]);
        }
      } catch (e) {
        console.error('Error parsing selected partials:', e);
        setSelectedPartials([]);
      }
    } else {
      console.log('No selected partials found in metaData');
      setSelectedPartials([]);
    }
  };

  const updateSelectedPartials = (newSelected) => {
    console.log('Updating selected partials:', newSelected);
    // Extract just the IDs for database storage
    const partialIds = newSelected.map(p => p.id || p);
    console.log('Calling onMetaChange with partial IDs:', partialIds);
    setSelectedPartials(newSelected);
    onMetaChange('blocks', 'selected_partials', JSON.stringify(partialIds));
  };

  // Convert selected partials to ReactTags format
  const selectedTags = selectedPartials.map(partial => ({
    id: partial.id,
    text: partial.title || partial.text || `Partial ${partial.id}`
  }));

  // Convert available partials to ReactTags suggestions format
  // Exclude already selected partials from suggestions
  const suggestions = availablePartials
    .filter(partial => !selectedPartials.some(selected => selected.id === partial.id))
    .map(partial => ({
      id: partial.id,
      text: partial.title
    }));

  // Handle tag deletion
  const handleDelete = (tagIndex) => {
    const newSelected = selectedPartials.filter((_, index) => index !== tagIndex);
    updateSelectedPartials(newSelected.map((p, index) => ({ ...p, order: index + 1 })));
  };

  // Handle tag addition
  const handleAddition = (tag) => {
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
  };

  // Handle tag reordering
  const handleDrag = (tag, currPos, newPos) => {
    const newSelected = [...selectedPartials];
    const [movedItem] = newSelected.splice(currPos, 1);
    newSelected.splice(newPos, 0, movedItem);

    // Update order numbers
    const reordered = newSelected.map((p, index) => ({ ...p, order: index + 1 }));
    updateSelectedPartials(reordered);
  };

  if (loading) {
    return <div className="p-4 text-center text-contrast">Loading partials...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Global Partials Section */}
      {globalPartials.length > 0 && (
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
      )}

      {/* Selected Partials Section using ReactTags */}
      <div className="flex-1">
        <label className="block text-sm font-medium text-contrast mb-2">
          Selected Partials
        </label>

        <ReactTags
          tags={selectedTags}
          suggestions={suggestions}
          handleDelete={handleDelete}
          handleAddition={handleAddition}
          handleDrag={handleDrag}
          placeholder="Type a partial name and press Enter..."
        />

        <p className="text-xs text-contrast mt-2">
          {selectedPartials.length > 0
            ? `${selectedPartials.length} partial${selectedPartials.length !== 1 ? 's' : ''} selected`
            : 'No partials selected. Type to search and add partials.'}
        </p>

        {availablePartials.length === 0 && !loading && (
          <p className="text-xs text-warning mt-2">
            No SCSS partials available. Create SCSS partial posts first.
          </p>
        )}
      </div>
    </div>
  );
};

export default ScssPartialsManager;