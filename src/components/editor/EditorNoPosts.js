import React, { useState } from 'react';
import { Button, Input, RadioInput } from '../ui';
import { TAXONOMY_TERMS } from '../../constants/taxonomy';
import { BlockIcon, SymbolIcon, StyleIcon } from '../icons';

const EditorNoPosts = ({ onPostCreate }) => {
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('blocks');
  const [titleError, setTitleError] = useState('');

  const getIconComponent = (slug) => {
    switch (slug) {
      case 'blocks': return <BlockIcon size={48} />;
      case 'symbols': return <SymbolIcon size={48} />;
      case 'scss-partials': return <StyleIcon size={48} />;
      default: return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate title
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }

    // Clear any previous errors
    setTitleError('');

    if (onPostCreate) {
      await onPostCreate({
        title: title.trim(),
        type: selectedType
      });
    }

    // Reset form
    setTitle('');
    setSelectedType('blocks');
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-base-1">
      <div className="max-w-2xl w-full p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selection */}
          <div>
            <label className="block text-sm font-medium text-highlight mb-3">
              Component Type
            </label>
            <div className="flex gap-4">
              {TAXONOMY_TERMS.map(term => (
                <label
                  key={term.slug}
                  className={`flex flex-col items-center gap-4 cursor-pointer p-3 rounded-lg border transition-all duration-200 ${
                    selectedType === term.slug
                      ? 'bg-action text-highlight border-action shadow-sm ring-2 ring-action/20'
                      : 'border-outline hover:border-contrast hover:bg-base-2'
                  }`}
                  style={{ flex: '1 0 0' }}
                >
                  <span className="flex flex-col items-center space-y-3">
                    <div className="p-4 flex items-center justify-center rounded-full bg-highlight/5">
                      {getIconComponent(term.slug)}
                    </div>
                    <span className="font-medium text-lg">
                      {term.name}
                    </span>
                    <span className="transition-colors duration-200 text-xs text-center">
                      {term.description}
                    </span>
                  </span>

                  <RadioInput
                    className='!hidden'
                    name="postType"
                    value={term.slug}
                    checked={selectedType === term.slug}
                    onChange={(e) => {
                      setSelectedType(e.target.value);
                    }}
                    style={{
                      accentColor: selectedType === term.slug ? term.color : undefined
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-highlight mb-2">
              {selectedType === 'blocks' && 'Block Title'}
              {selectedType === 'symbols' && 'Symbol Title'}
              {selectedType === 'scss-partials' && 'SCSS Partial Title'}
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(''); // Clear error when user starts typing
              }}
              placeholder="Enter post title"
              error={titleError}
              autoFocus
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              className='w-full !p-3'
            >
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditorNoPosts;