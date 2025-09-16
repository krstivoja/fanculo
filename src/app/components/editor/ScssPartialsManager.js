import React, { useState, useEffect } from 'react';
import { Button } from '../ui';

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
      const response = await fetch('/wp-json/funculo/v1/scss-partials', {
        headers: {
          'X-WP-Nonce': window.wpApiSettings.nonce
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('SCSS Partials API Response:', data);
        setGlobalPartials(data.global_partials || []);
        setAvailablePartials(data.available_partials || []);
        console.log('Global partials set:', data.global_partials || []);
        console.log('Available partials set:', data.available_partials || []);
      } else {
        console.error('SCSS Partials API Error:', response.status, response.statusText);
      }
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
                <span className="text-xs bg-action text-white px-2 py-1 rounded font-mono">
                  {partial.global_order}
                </span>
                <span className="flex-1 text-sm">{partial.title}</span>
                <span className="text-xs text-contrast">@import "{partial.slug}";</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Partials Section */}
      <div className="mb-6">
        <h4 className="font-medium text-highlight mb-3">
          Selected Partials {selectedPartials.length > 0 && `(${selectedPartials.length})`}
        </h4>

        {selectedPartials.length === 0 ? (
          <div className="p-4 text-center text-contrast bg-base-2 border border-outline rounded">
            No partials selected. Choose from available partials below.
          </div>
        ) : (
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
                <span className="text-xs bg-highlight text-white px-2 py-1 rounded font-mono">
                  {globalPartials.length + partial.order}
                </span>
                <span className="flex-1 text-sm">{partial.title}</span>
                <span className="text-xs text-contrast">@import "{partial.slug}";</span>
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
        )}
      </div>

      {/* Available Partials Section */}
      <div className="flex-1">
        <h4 className="font-medium text-highlight mb-3">
          Available Partials {availablePartials.length > 0 && `(${availablePartials.length})`}
        </h4>

        {availablePartials.length === 0 ? (
          <div className="p-4 text-center text-contrast bg-base-2 border border-outline rounded">
            No additional partials available.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availablePartials.map((partial) => (
              <div
                key={partial.id}
                className="flex items-center gap-3 p-3 bg-base-2 border border-outline rounded hover:bg-base-3 transition-colors"
              >
                <span className="flex-1 text-sm">{partial.title}</span>
                <span className="text-xs text-contrast">@import "{partial.slug}";</span>
                <Button
                  onClick={() => addPartial(partial)}
                  disabled={isPartialSelected(partial.id)}
                  variant="primary"
                  size="sm"
                  className="!p-1 !text-xs"
                >
                  {isPartialSelected(partial.id) ? '✓' : '+'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Reminder */}
      {selectedPartials.length > 0 && (
        <div className="mt-4 p-3 bg-action bg-opacity-10 border border-action rounded">
          <div className="text-sm text-action">
            💾 Remember to click the main <strong>"Save"</strong> button to persist your SCSS partials selection.
          </div>
        </div>
      )}

      {/* Import Preview */}
      {(globalPartials.length > 0 || selectedPartials.length > 0) && (
        <div className="mt-6 pt-4 border-t border-outline">
          <h5 className="text-sm font-medium text-highlight mb-2">Import Order Preview:</h5>
          <div className="text-xs font-mono bg-base-2 p-3 rounded border">
            {globalPartials.map(p => (
              <div key={`global-${p.id}`} className="text-action">
                @import "{p.slug}"; // Global #{p.global_order}
              </div>
            ))}
            {selectedPartials.map(p => (
              <div key={`selected-${p.id}`} className="text-highlight">
                @import "{p.slug}"; // Selected #{globalPartials.length + p.order}
              </div>
            ))}
            <div className="text-contrast mt-2">// Your block styles...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScssPartialsManager;