import React from 'react';

const EditorSettings = ({ selectedPost }) => {
  if (!selectedPost) {
    return null;
  }

  return (
    <aside id="editor-settings" className='grow max-w-[var(--sidebar)] border-l border-solid border-outline'>
      <div>Settings:</div>
      <p>ID: {selectedPost.id}</p>
    </aside>
  );
};

export default EditorSettings;