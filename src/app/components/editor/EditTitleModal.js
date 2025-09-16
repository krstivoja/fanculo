import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';

const EditTitleModal = ({ isOpen, onClose, currentTitle, onSave }) => {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle || '');
    }
  }, [isOpen, currentTitle]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSave(title.trim());
      onClose();
    } catch (error) {
      console.error('Error saving title:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle(currentTitle || '');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Post Title">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="post-title" className="block text-sm font-medium mb-2">
            Post Title
          </label>
          <Input
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title..."
            required
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !title.trim()}
          >
            {isLoading ? 'Saving...' : 'Save Title'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTitleModal;