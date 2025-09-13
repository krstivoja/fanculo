import React from 'react';

const EditorSettings = ({ selectedPost }) => {
  if (!selectedPost) {
    return null;
  }

  return (
    <aside id="editor-settings" className='grow max-w-[var(--sidebar)] border-l border-solid border-outline'>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Post ID</label>
            <div className="text-sm text-contrast">{selectedPost.id}</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <div className="text-sm">{selectedPost.title?.rendered || selectedPost.title}</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <div className="text-sm text-contrast">{selectedPost.status || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <div className="text-sm text-contrast">{selectedPost.funculo_type || 'N/A'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EditorSettings;