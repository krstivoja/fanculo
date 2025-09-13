import React from 'react';
import { Textarea } from '../ui';

const EditorMain = ({ selectedPost }) => {
  return (
    <main id="editor-content" className="flex-1 p-4 grow">
      {selectedPost ? (
        <div>
          <h1>{selectedPost.title.rendered}</h1>
          <p>ID: {selectedPost.id}</p>

          <p>PHP</p>
          <Textarea></Textarea>
          <p>SCSS</p>
          <Textarea></Textarea>
          <p>JS</p>
          <Textarea></Textarea>
          <p>Attributes</p>
          <Textarea></Textarea>

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