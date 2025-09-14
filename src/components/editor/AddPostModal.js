import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import { TAXONOMY_TERMS } from '../../constants/taxonomy';
import { BlockIcon, SymbolIcon, StyleIcon } from '../icons';

const AddPostModal = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('blocks');

  const getIconComponent = (slug) => {
    const iconClass = `transition-colors duration-200 ${
      selectedType === slug ? 'text-action' : 'text-contrast'
    }`;
    
    switch (slug) {
      case 'blocks': return <BlockIcon size={32} className={iconClass} />;
      case 'symbols': return <SymbolIcon size={32} className={iconClass} />;
      case 'scss-partials': return <StyleIcon size={32} className={iconClass} />;
      default: return null;
    }
  };

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSelectedType('blocks');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting with selectedType:', selectedType); // Debug log
    if (title.trim()) {
      onCreate({
        title: title.trim(),
        type: selectedType
      });
      setTitle('');
      setSelectedType('blocks');
      onClose();
    }
  };

  const handleCancel = () => {
    setTitle('');
    setSelectedType('blocks');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Post Type Selection */}
        <div>
          <label className="block text-sm font-medium text-highlight mb-3">
            Post Type
          </label>
          <div className="flex gap-4">
            {TAXONOMY_TERMS.map(term => (
              <label
                key={term.slug}
                className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border transition-all duration-200 flex flex-col ${
                  selectedType === term.slug 
                    ? 'bg-action/10 border-action shadow-sm ring-2 ring-action/20' 
                    : 'border-outline hover:border-contrast hover:bg-base-alt'
                }`}
                style={{ flex: '1 0 0' }} // allow equal width, but not forced min-width
              >

                 <span className="flex flex-col items-center space-y-3">
                   <div className={`w-16 h-16 flex items-center justify-center rounded-lg transition-all duration-200 ${
                     selectedType === term.slug 
                       ? 'bg-action/20' 
                       : 'bg-outline/20'
                   }`}>
                     {getIconComponent(term.slug)}
                   </div>
                   <span className={`font-medium transition-colors duration-200 text-sm ${
                     selectedType === term.slug 
                       ? 'text-action' 
                       : 'text-contrast'
                   }`}>
                     {term.name}
                   </span>
                 </span>

                <input
                  type="radio"
                  name="postType"
                  value={term.slug}
                  checked={selectedType === term.slug}
                  onChange={(e) => {
                    console.log('Radio changed to:', e.target.value); // Debug log
                    setSelectedType(e.target.value);
                  }}
                  className={`w-4 h-4 border-2 transition-all duration-200 ${
                    selectedType === term.slug
                      ? 'border-action bg-action'
                      : 'border-outline bg-base hover:border-contrast'
                  } focus:ring-2 focus:ring-action/30 focus:ring-offset-1`}
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
            Title
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title"
            className="w-full"
            autoFocus
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim()}
          >
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPostModal;