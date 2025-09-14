import React, { useState, Suspense, lazy } from 'react';
import MetaboxContainer from './metaboxes/MetaboxContainer';

// Lazy load EditTitleModal - only loads when title is clicked
const EditTitleModal = lazy(() => import('./EditTitleModal'));

const EditorMain = ({ selectedPost, metaData, onMetaChange, onTitleUpdate }) => {
  const [isEditTitleModalOpen, setIsEditTitleModalOpen] = useState(false);

  console.log('EditorMain - selectedPost:', selectedPost);
  console.log('EditorMain - metaData:', metaData);

  const handleTitleClick = () => {
    setIsEditTitleModalOpen(true);
  };

  const handleTitleSave = async (newTitle) => {
    if (onTitleUpdate) {
      await onTitleUpdate(newTitle);
    }
  };

  return (
    <main id="editor-content" className="flex-1 p-4 grow overflow-y-auto">
      {selectedPost ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 pb-4 border-b border-outline">
            <h1
              className="text-2xl font-bold mb-2 text-action cursor-pointer hover:text-highlight transition-colors"
              onClick={handleTitleClick}
              title="Click to edit title"
            >
              {selectedPost.title?.rendered || selectedPost.title || 'Untitled Post'}
            </h1>
          </div>

          <MetaboxContainer
            selectedPost={selectedPost}
            metaData={metaData}
            onMetaChange={onMetaChange}
          />

          {isEditTitleModalOpen && (
            <Suspense fallback={null}>
              <EditTitleModal
                isOpen={isEditTitleModalOpen}
                onClose={() => setIsEditTitleModalOpen(false)}
                currentTitle={selectedPost.title?.rendered || selectedPost.title}
                onSave={handleTitleSave}
              />
            </Suspense>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-contrast">
          <div className="text-center">
            <div className="text-xl mb-2">📝</div>
            <div>Select a post from the sidebar to start editing</div>
          </div>
        </div>
      )}
    </main>
  );
};

export default EditorMain;