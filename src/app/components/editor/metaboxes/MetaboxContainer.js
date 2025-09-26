import React from 'react';
import BlocksMetaboxes from './BlocksMetaboxes';
import SymbolsMetaboxes from './SymbolsMetaboxes';
import ScssPartialsMetaboxes from './ScssPartialsMetaboxes';
import { useEditor } from '../../../hooks';

const MetaboxContainer = ({ titleComponent }) => {
  const { selectedPost, getPostType } = useEditor();
  const postType = getPostType();

  if (!selectedPost) {
    return null;
  }

  return (
    <>
      {postType === 'blocks' && (
        <BlocksMetaboxes titleComponent={titleComponent} />
      )}

      {postType === 'symbols' && (
        <SymbolsMetaboxes titleComponent={titleComponent} />
      )}

      {postType === 'scss-partials' && (
        <ScssPartialsMetaboxes titleComponent={titleComponent} />
      )}

      {!postType && (
        <div className="text-center text-contrast py-8">
          <p>No metaboxes available for this post type</p>
        </div>
      )}
    </>
  );
};

export default MetaboxContainer;