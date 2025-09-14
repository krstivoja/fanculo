import React, { useState, useEffect } from 'react';
import { Button } from '../ui';
import AddPostModal from './AddPostModal';
import { LogoIcon } from '../icons';

const EditorHeader = ({ onSave, saveStatus, hasUnsavedChanges }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Handle Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        onSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave]);

  const handleCreatePost = async (postData) => {
    try {
      console.log('Creating post with data:', postData);

      const response = await fetch('/wp-json/funculo/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings.nonce
        },
        body: JSON.stringify({
          title: postData.title,
          status: 'publish',
          taxonomy_term: postData.type
        })
      });

      if (response.ok) {
        const newPost = await response.json();
        console.log('Post created successfully:', newPost);
        // Optionally refresh the post list or add to state
      } else {
        console.error('Failed to create post:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };
  return (
    <header id="editor-header" className='h-fit border-b border-solid border-outline flex items-center justify-between'>
      <div className='flex gap-4 items-center'>
        <div className=' bg-contrast text-base p-3 w-fit'>
          <LogoIcon />
        </div>

        <Button
          variant="secondary"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add new
        </Button>
      </div>
      <div className='flex gap-4 justify-center mr-4 items-center'>
        {saveStatus === 'unsaved' && (
          <span className="text-sm text-yellow-600">Unsaved changes</span>
        )}
        {saveStatus === 'saving' && (
          <span className="text-sm text-blue-600">Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-sm text-green-600">Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm text-red-600">Error saving</span>
        )}
        <Button
          variant="secondary"
          className=' !bg-action !text-highlight'
          onClick={onSave}
          disabled={saveStatus === 'saving'}
        >
          Save
        </Button>
      </div>

      <AddPostModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreatePost}
      />
    </header>
  );
};

export default EditorHeader;