import React, { useState, Suspense, lazy } from 'react';
import MetaboxContainer from './metaboxes/MetaboxContainer';
import { BlockIcon, SymbolIcon, StyleIcon } from '../icons';

// Lazy load EditTitleModal - only loads when title is clicked
const EditTitleModal = lazy(() => import('./EditTitleModal'));

const EditorMain = ({ selectedPost, metaData, onMetaChange, onTitleUpdate }) => {
  const [isEditTitleModalOpen, setIsEditTitleModalOpen] = useState(false);

  console.log('EditorMain - selectedPost:', selectedPost);
  console.log('EditorMain - metaData:', metaData);

  // Get the appropriate icon based on post type
  const getTypeIcon = () => {
    if (!selectedPost?.terms || !selectedPost.terms.length) {
      return null;
    }

    const termSlug = selectedPost.terms[0].slug;
    switch (termSlug) {
      case 'blocks':
        return <BlockIcon size={24} />;
      case 'symbols':
        return <SymbolIcon size={24} />;
      case 'scss-partials':
        return <StyleIcon size={24} />;
      default:
        return null;
    }
  };

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
              className="text-2xl font-bold mb-2 text-action cursor-pointer hover:text-highlight transition-colors flex items-center gap-3"
              onClick={handleTitleClick}
              title="Click to edit title"
            >
              {getTypeIcon()}
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