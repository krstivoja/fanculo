import React, { useState, Suspense, lazy, useCallback, useMemo } from 'react';
import MetaboxContainer from './metaboxes/MetaboxContainer';
import { BlockIcon, SymbolIcon, StyleIcon } from '../icons';

// Lazy load EditTitleModal - only loads when title is clicked
const EditTitleModal = lazy(() => import('./EditTitleModal'));

const EditorMain = ({ selectedPost, metaData, onMetaChange, onTitleUpdate }) => {
  const [isEditTitleModalOpen, setIsEditTitleModalOpen] = useState(false);

  // Memoize the type icon to prevent re-creation on every render
  const typeIcon = useMemo(() => {
    if (!selectedPost?.terms || !selectedPost.terms.length) {
      return null;
    }

    const termSlug = selectedPost.terms[0].slug;
    switch (termSlug) {
      case 'blocks':
        return <BlockIcon size={48} />;
      case 'symbols':
        return <SymbolIcon size={48} />;
      case 'scss-partials':
        return <StyleIcon size={48} />;
      default:
        return null;
    }
  }, [selectedPost?.terms]);

  // Memoize the post title to prevent re-computation
  const postTitle = useMemo(() => {
    return selectedPost?.title?.rendered || selectedPost?.title || 'Untitled Post';
  }, [selectedPost?.title]);

  // Memoize event handlers to prevent child component re-renders
  const handleTitleClick = useCallback(() => {
    setIsEditTitleModalOpen(true);
  }, []);

  const handleTitleModalClose = useCallback(() => {
    setIsEditTitleModalOpen(false);
  }, []);

  const handleTitleSave = useCallback(async (newTitle) => {
    if (onTitleUpdate) {
      await onTitleUpdate(newTitle);
    }
  }, [onTitleUpdate]);

  // Memoize the title component to prevent recreation when props haven't changed
  const titleComponent = useMemo(() => (
    <h1
      className="!text-5xl font-semibold cursor-pointer hover:!text-highlight hover:underline !flex items-center gap-3 !p-8 !pb-4"
      onClick={handleTitleClick}
      title="Click to edit title"
    >
      <span className='bg-base-2 p-2 rounded-full'>{typeIcon}</span>
      {postTitle}
    </h1>
  ), [typeIcon, postTitle, handleTitleClick]);

  return (
    <main id="editor-content" className="flex-1 grow overflow-y-auto flex flex-col">
      {selectedPost ? (
        <>
          <MetaboxContainer
            selectedPost={selectedPost}
            metaData={metaData}
            onMetaChange={onMetaChange}
            titleComponent={titleComponent}
          />


          {isEditTitleModalOpen && (
            <Suspense fallback={null}>
              <EditTitleModal
                isOpen={isEditTitleModalOpen}
                onClose={handleTitleModalClose}
                currentTitle={postTitle}
                onSave={handleTitleSave}
              />
            </Suspense>
          )}
        </>
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

// Memoize the component to prevent unnecessary re-renders when metaData hasn't changed
export default React.memo(EditorMain, (prevProps, nextProps) => {
  // Custom comparison function focusing on expensive props
  return (
    // Check if selectedPost is the same object or has same essential properties
    prevProps.selectedPost?.id === nextProps.selectedPost?.id &&
    prevProps.selectedPost?.title === nextProps.selectedPost?.title &&
    // Deep comparison of terms (only first level needed for type icon)
    JSON.stringify(prevProps.selectedPost?.terms) === JSON.stringify(nextProps.selectedPost?.terms) &&
    // Check if metaData reference is the same (shallow comparison for performance)
    prevProps.metaData === nextProps.metaData &&
    // Check if callback functions are the same reference
    prevProps.onMetaChange === nextProps.onMetaChange &&
    prevProps.onTitleUpdate === nextProps.onTitleUpdate
  );
});