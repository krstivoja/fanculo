import React, { useState, Suspense, lazy } from "react";
import { BlockIcon, SymbolIcon, StyleIcon } from "../icons";
import BlocksMetaboxes from "./metaboxes/BlocksMetaboxes";
import SymbolsMetaboxes from "./metaboxes/SymbolsMetaboxes";
import ScssPartialsMetaboxes from "./metaboxes/ScssPartialsMetaboxes";

// Lazy load EditTitleModal - only loads when title is clicked
const EditTitleModal = lazy(() => import("./EditTitleModal"));

const getTypeIcon = (termSlug) => {
  switch (termSlug) {
    case "blocks":
      return <BlockIcon size={48} />;
    case "symbols":
      return <SymbolIcon size={48} />;
    case "scss-partials":
      return <StyleIcon size={48} />;
    default:
      return null;
  }
};

const MainContent = ({
  selectedPost,
  metaData,
  onMetaChange,
  onTitleUpdate,
  isLoadingPost = false,
}) => {
  const [isEditTitleModalOpen, setIsEditTitleModalOpen] = useState(false);

  const handleTitleSave = async (newTitle) => {
    if (onTitleUpdate) {
      await onTitleUpdate(newTitle);
    }
  };

  const postType = selectedPost?.terms?.[0]?.slug || null;
  const postTitle = selectedPost?.title?.rendered || selectedPost?.title || "Untitled Post";
  const typeIcon = postType ? getTypeIcon(postType) : null;

  const titleComponent = (
    <h1
      className="!text-5xl font-semibold cursor-pointer hover:!text-highlight hover:underline !flex items-center gap-3 !p-8 !pb-4"
      onClick={() => setIsEditTitleModalOpen(true)}
      title="Click to edit title"
    >
      <span className="bg-base-2 p-2 rounded-full">{typeIcon}</span>
      {postTitle}
    </h1>
  );

  return (
    <main
      id="editor-content"
      className="flex-1 grow overflow-y-auto flex flex-col"
    >
      {isLoadingPost ? (
        <div className="flex items-center justify-center h-full text-contrast">
          <div className="text-center">
            <div className="text-xl mb-2">⏳</div>
            <div>Loading post...</div>
          </div>
        </div>
      ) : selectedPost ? (
        <>
          {postType === "blocks" && (
            <BlocksMetaboxes
              metaData={metaData}
              onChange={onMetaChange}
              titleComponent={titleComponent}
              selectedPost={selectedPost}
            />
          )}

          {postType === "symbols" && (
            <SymbolsMetaboxes
              metaData={metaData}
              onChange={onMetaChange}
              titleComponent={titleComponent}
              selectedPost={selectedPost}
            />
          )}

          {postType === "scss-partials" && (
            <ScssPartialsMetaboxes
              metaData={metaData}
              onChange={onMetaChange}
              titleComponent={titleComponent}
              selectedPost={selectedPost}
            />
          )}

          {!postType && (
            <div className="text-center text-contrast py-8">
              <p>No metaboxes available for this post type</p>
            </div>
          )}

          {isEditTitleModalOpen && (
            <Suspense fallback={null}>
              <EditTitleModal
                isOpen={isEditTitleModalOpen}
                onClose={() => setIsEditTitleModalOpen(false)}
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

export default MainContent;
