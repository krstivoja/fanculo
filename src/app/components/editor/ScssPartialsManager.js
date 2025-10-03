import React, { useState, useEffect } from 'react';
import { ReactTags } from '../ui';

const ScssPartialsManager = ({
  selectedPost,
  metaData,
  onMetaChange,
  mode = 'style',
  hideGlobalPartials = false,
  sharedData,
  dataLoading
}) => {
  const [selectedPartials, setSelectedPartials] = useState([]);

  const globalPartials = sharedData?.scssPartials?.globalPartials || [];
  const availablePartials = sharedData?.scssPartials?.availablePartials || [];
  const loading = dataLoading?.scssPartials || false;

  const fieldName = mode === 'editorStyle' ? 'editorSelectedPartials' : 'selectedPartials';

  const processSelectedPartials = () => {
    const blockSelectedPartials = metaData?.blocks?.[fieldName];

    if (!blockSelectedPartials) {
      return [];
    }

    try {
      const parsed = typeof blockSelectedPartials === 'string'
        ? JSON.parse(blockSelectedPartials)
        : blockSelectedPartials;

      if (Array.isArray(parsed)) {
        const allPartials = [...availablePartials, ...globalPartials];
        return parsed.map((item, index) => {
          if (typeof item === 'number' || typeof item === 'string') {
            const partialId = typeof item === 'string' ? parseInt(item) : item;
            const foundPartial = allPartials.find(p => p.id === partialId);

            if (foundPartial) {
              return {
                id: foundPartial.id,
                slug: foundPartial.slug,
                title: foundPartial.title,
                order: index + 1
              };
            }
            return { id: partialId, title: `Partial ${partialId}`, order: index + 1 };
          }
          return item;
        });
      }
    } catch (e) {
      console.error('Error parsing selected partials:', e);
    }

    return [];
  };

  useEffect(() => {
    if (selectedPost?.id && !loading && availablePartials.length >= 0) {
      setSelectedPartials(processSelectedPartials());
    }
  }, [selectedPost?.id, loading, availablePartials, metaData, mode]);

  const updateSelectedPartials = (newSelected) => {
    const partialIds = newSelected.map(p => p.id || p);
    setSelectedPartials(newSelected);
    onMetaChange('blocks', fieldName, JSON.stringify(partialIds));
  };

  const handleDelete = (tagIndex) => {
    const newSelected = selectedPartials.filter((_, index) => index !== tagIndex);
    updateSelectedPartials(newSelected.map((p, index) => ({ ...p, order: index + 1 })));
  };

  const handleAddition = (tag) => {
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

  const handleDrag = (tag, currPos, newPos) => {
    const newSelected = [...selectedPartials];
    const [movedItem] = newSelected.splice(currPos, 1);
    newSelected.splice(newPos, 0, movedItem);

    const reordered = newSelected.map((p, index) => ({ ...p, order: index + 1 }));
    updateSelectedPartials(reordered);
  };

  if (loading) {
    return <div className="p-4 text-center text-contrast">Loading partials...</div>;
  }

  const selectedTags = selectedPartials.map(partial => ({
    id: partial.id,
    text: partial.title || partial.text || `Partial ${partial.id}`
  }));

  const suggestions = availablePartials
    .filter(partial => !selectedPartials.some(selected => selected.id === partial.id))
    .map(partial => ({
      id: partial.id,
      text: partial.title
    }));

  const statusText = selectedPartials.length > 0
    ? `${selectedPartials.length} partial${selectedPartials.length !== 1 ? 's' : ''} selected`
    : 'No partials selected. Type to search and add partials.';

  return (
    <div className="flex flex-col h-full">
      {/* Global Partials Section */}
      {!hideGlobalPartials && globalPartials.length > 0 && (
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
