import React from 'react';

const EditorMain = ({ selectedPost }) => {
  return (
    <main id="editor-content" className="flex-1 p-4 grow">
      {selectedPost ? (
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {selectedPost.title?.rendered || selectedPost.title}
            </h1>
            <div className="text-sm text-contrast">
              ID: {selectedPost.id}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Content</h2>
              <div className="border border-outline rounded p-4 min-h-[200px] bg-surface">
                {selectedPost.content?.rendered ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.content.rendered }} />
                ) : (
                  <div className="text-contrast italic">No content available</div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Excerpt</h2>
              <div className="border border-outline rounded p-4 bg-surface">
                {selectedPost.excerpt?.rendered ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.excerpt.rendered }} />
                ) : (
                  <div className="text-contrast italic">No excerpt available</div>
                )}
              </div>
            </div>
          </div>
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