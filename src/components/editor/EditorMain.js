import React from 'react';
import MetaboxContainer from './metaboxes/MetaboxContainer';

const EditorMain = ({ selectedPost, metaData, onMetaChange }) => {
  console.log('EditorMain - selectedPost:', selectedPost);
  console.log('EditorMain - metaData:', metaData);

  return (
    <main id="editor-content" className="flex-1 p-4 grow overflow-y-auto">
      {selectedPost ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 pb-4 border-b border-outline">
            <h1 className="text-2xl font-bold mb-2 text-action">
              {selectedPost.title?.rendered || selectedPost.title || 'Untitled Post'}
            </h1>
            <div className="flex gap-4 text-sm text-contrast">
              <span>ID: {selectedPost.id}</span>
              <span>Type: {selectedPost.terms?.[0]?.name || 'N/A'}</span>
            </div>
          </div>

          <MetaboxContainer
            selectedPost={selectedPost}
            metaData={metaData}
            onMetaChange={onMetaChange}
          />
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