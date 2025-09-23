import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Button, Toast } from '../ui';
import { LogoIcon, WordPressIcon } from '../icons';
import { apiClient } from '../../../utils';

// Lazy load AddPostModal - only loads when needed
const AddPostModal = lazy(() => import('./AddPostModal'));

const EditorHeader = ({ onSave, saveStatus, hasUnsavedChanges, onPostsRefresh }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

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

      const newPost = await apiClient.createPost({
        title: postData.title,
        status: 'publish',
        taxonomy_term: postData.type
      });

      console.log('Post created successfully:', newPost);

      // Refresh the posts list to show the new post
      if (onPostsRefresh) {
        onPostsRefresh();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleRegenerateAll = async () => {
    if (!confirm('⚠️ Regenerate all files? This will forcefully recreate all files and may take several seconds.')) {
      return;
    }

    setIsRegenerating(true);
    setToast({ show: true, message: 'Starting full regeneration...', type: 'info' });

    try {
      console.log('Force regenerating all files...');

      // Use centralized API client for force regeneration
      const result = await apiClient.forceRegenerateAll();
      console.log('All files regenerated successfully:', result);
      setToast({ show: true, message: '✅ All files regenerated successfully!', type: 'success' });

      // Refresh posts list in case files were updated
      if (onPostsRefresh) {
        onPostsRefresh();
      }
    } catch (error) {
      console.error('Failed to regenerate files:', error);
      setToast({ show: true, message: `❌ Failed to regenerate files: ${error.message}`, type: 'error' });
    } finally {
      setIsRegenerating(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'info' });
  };
  return (
    <header id="editor-header" className='h-fit border-b border-solid border-outline flex items-center justify-between'>
      <div className='flex gap-4 items-center'>
        <div
          className='bg-contrast hover:bg-action text-base-1 hover:text-highlight p-3 w-fit cursor-pointer transition-all duration-200 hover:bg-opacity-80 group relative'
          onClick={() => window.location.href = '/wp-admin/'}
          title="Go to WordPress Admin"
        >
          <div className="group-hover:opacity-0 ">
            <LogoIcon />
          </div>
          <div className="absolute inset-0 p-3 opacity-0 group-hover:opacity-100 ">
            <WordPressIcon size={32} />
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add new
        </Button>

        <Button
          variant="secondary"
          onClick={handleRegenerateAll}
          disabled={isRegenerating}
          className="!bg-orange-600 !text-white hover:!bg-orange-700"
          title="Force regenerate all files (use if files are out of sync)"
        >
          {isRegenerating ? 'Regenerating...' : 'Regenerate All'}
        </Button>
      </div>
      <div className='flex gap-4 justify-center mr-4 items-center relative'>
        {/* Add dot inside button if we have unsaved changes */}
        {saveStatus === 'unsaved' && (
          <span className="absolute bg-action w-2.5 h-2.5 flex top-0 right-0 rounded-full -translate-y-[50%] translate-x-[50%]"></span>
        )}        
        <Button
          variant="secondary"
          className={`${saveStatus === 'error' ? '!bg-red-600 !text-white hover:!bg-red-700' : '!bg-base-2'}`}
          onClick={onSave}
          disabled={saveStatus === 'saving'}
        >
          {
            saveStatus === 'saving' ? 'Saving...' :
            saveStatus === 'error' ? '⚠︎ Error - Retry' :
            'Save'
          }
        </Button>
      </div>

      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddPostModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onCreate={handleCreatePost}
          />
        </Suspense>
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </header>
  );
};

export default EditorHeader;