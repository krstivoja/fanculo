import React from 'react';
import BlocksMetaboxes from './BlocksMetaboxes';
import SymbolsMetaboxes from './SymbolsMetaboxes';
import ScssPartialsMetaboxes from './ScssPartialsMetaboxes';

const MetaboxContainer = ({ selectedPost, metaData, onMetaChange, titleComponent }) => {

  // Determine post type from terms
  const getPostType = () => {
    if (!selectedPost?.terms || !selectedPost.terms.length) {
      console.error('No terms found for post:', selectedPost);
      return null;
    }
    const termSlug = selectedPost.terms[0].slug;
    return termSlug;
  };

  // Handle meta field changes - delegate to parent
  const handleMetaChange = (section, field, value) => {
    onMetaChange(section, field, value);
  };

  const postType = getPostType();

  if (!selectedPost) {
    return null;
  }

  return (
    <>
      {postType === 'blocks' && (
        <BlocksMetaboxes
          metaData={metaData}
          onChange={handleMetaChange}
          titleComponent={titleComponent}
          selectedPost={selectedPost}
        />
      )}

      {postType === 'symbols' && (
        <SymbolsMetaboxes
          metaData={metaData}
          onChange={handleMetaChange}
          titleComponent={titleComponent}
          selectedPost={selectedPost}
        />
      )}

      {postType === 'scss-partials' && (
        <ScssPartialsMetaboxes
          metaData={metaData}
          onChange={handleMetaChange}
          titleComponent={titleComponent}
          selectedPost={selectedPost}
        />
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