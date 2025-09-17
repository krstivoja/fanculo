import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import { apiClient } from '../../../utils';

const ScssPartialsManager = ({ selectedPost, metaData, onMetaChange }) => {
  const [globalPartials, setGlobalPartials] = useState([]);
  const [availablePartials, setAvailablePartials] = useState([]);
  const [selectedPartials, setSelectedPartials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);

  // Load partials data on component mount
  useEffect(() => {
    if (selectedPost?.id) {
      loadPartials();
      loadSelectedPartials();
    }
  }, [selectedPost?.id]);

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
        setSelectedPartials(Array.isArray(parsed) ? parsed : []);
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
    console.log('Calling onMetaChange with:', 'blocks', 'selected_partials', JSON.stringify(newSelected));
    setSelectedPartials(newSelected);
    onMetaChange('blocks', 'selected_partials', JSON.stringify(newSelected));
  };

  const addPartial = (partial) => {
    const newPartial = {
      id: partial.id,
      slug: partial.slug,
      title: partial.title,
      order: selectedPartials.length + 1
    };

    updateSelectedPartials([...selectedPartials, newPartial]);
  };

  const removePartial = (partialId) => {
    const newSelected = selectedPartials
      .filter(p => p.id !== partialId)
      .map((p, index) => ({ ...p, order: index + 1 }));

    updateSelectedPartials(newSelected);
  };

  const movePartial = (fromIndex, toIndex) => {
    const newSelected = [...selectedPartials];
    const [movedItem] = newSelected.splice(fromIndex, 1);
    newSelected.splice(toIndex, 0, movedItem);

    // Update order numbers
    const reordered = newSelected.map((p, index) => ({ ...p, order: index + 1 }));
    updateSelectedPartials(reordered);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem !== null && draggedItem !== dropIndex) {
      movePartial(draggedItem, dropIndex);
    }
    setDraggedItem(null);
  };

  const isPartialSelected = (partialId) => {
    return selectedPartials.some(p => p.id === partialId);
  };

  // Filter available partials to exclude selected ones
  const inactivePartials = availablePartials.filter(partial => !isPartialSelected(partial.id));

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

      {/* Selected Partials Section */}
      {selectedPartials.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-highlight mb-3">
            Included ({selectedPartials.length})
          </h4>

          <div className="space-y-2">
            {selectedPartials.map((partial, index) => (
              <div
                key={partial.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className="flex items-center gap-3 p-3 bg-base-2 border border-outline rounded cursor-move hover:bg-base-3 transition-colors"
              >
                <span className="flex-1 text-sm">{partial.title}</span>
                <Button
                  onClick={() => removePartial(partial.id)}
                  variant="secondary"
                  size="sm"
                  className="!p-1 !text-xs"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Partials Section */}
      {inactivePartials.length > 0 && (
        <div className="flex-1">
          <h4 className="font-medium text-highlight mb-3">
            Inactive ({inactivePartials.length})
          </h4>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {inactivePartials.map((partial) => (
              <div
                key={partial.id}
                className="flex items-center gap-3 p-3 bg-base-2 border border-outline rounded hover:bg-base-3 transition-colors"
              >
                <span className="flex-1 text-sm">{partial.title}</span>
                <Button
                  onClick={() => addPartial(partial)}
                  variant="primary"
                  size="sm"
                  className="!p-1 !text-xs"
                >
                  +
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
};

export default ScssPartialsManager;