import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import { TAXONOMY_TERMS } from '../../constants/taxonomy';

const AddPostModal = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('blocks');

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
    <Modal isOpen={isOpen} onClose={handleCancel} title="Add New Post">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Post Type Selection */}
        <div>
          <label className="block text-sm font-medium text-highlight mb-3">
            Post Type
          </label>
          <div className="space-y-2">
            {TAXONOMY_TERMS.map(term => (
              <label
                key={term.slug}
                className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border transition-colors ${
                  selectedType === term.slug 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="postType"
                  value={term.slug}
                  checked={selectedType === term.slug}
                  onChange={(e) => {
                    console.log('Radio changed to:', e.target.value); // Debug log
                    setSelectedType(e.target.value);
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                  style={{
                    accentColor: term.color,
                    color: term.color
                  }}
                />
                <span className="flex items-center space-x-2">
                  <span>{term.icon}</span>
                  <span className="text-contrast">{term.name}</span>
                </span>
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