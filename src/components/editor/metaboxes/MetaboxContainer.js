import React from 'react';
import BlocksMetaboxes from './BlocksMetaboxes';
import SymbolsMetaboxes from './SymbolsMetaboxes';
import ScssPartialsMetaboxes from './ScssPartialsMetaboxes';

const MetaboxContainer = ({ selectedPost, metaData, onMetaChange }) => {

  // Determine post type from terms
  const getPostType = () => {
    if (!selectedPost?.terms || !selectedPost.terms.length) {
      console.log('No terms found for post:', selectedPost);
      return null;
    }
    const termSlug = selectedPost.terms[0].slug;
    console.log('Post type determined:', termSlug, 'from terms:', selectedPost.terms);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Metaboxes</h2>
      </div>

      {postType === 'blocks' && (
        <BlocksMetaboxes
          metaData={metaData}
          onChange={handleMetaChange}
        />
      )}

      {postType === 'symbols' && (
        <SymbolsMetaboxes
          metaData={metaData}
          onChange={handleMetaChange}
        />
      )}

      {postType === 'scss-partials' && (
        <ScssPartialsMetaboxes
          metaData={metaData}
          onChange={handleMetaChange}
        />
      )}

      {!postType && (
        <div className="text-center text-contrast py-8">
          <p>No metaboxes available for this post type</p>
        </div>
      )}
    </div>
  );
};

export default MetaboxContainer;