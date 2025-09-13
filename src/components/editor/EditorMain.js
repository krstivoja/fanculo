import React from 'react';

const EditorMain = ({ selectedPost }) => {
  return (
    <main id="editor-content" className="flex-1 p-4 grow">
      {selectedPost ? (
        <div>
          <h1>{selectedPost.title.rendered}</h1>
          <p>ID: {selectedPost.id}</p>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-contrast">
          Select a post from the sidebar
        </div>
      )}
    </main>
  );
};

export default EditorMain;