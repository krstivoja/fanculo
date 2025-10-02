import React, { useEffect } from 'react';
import { MonacoEditor } from '../../ui';

const ScssPartialsMetaboxes = ({ metaData, onChange, titleComponent, selectedPost }) => {
  const handleMetaChange = (field, value) => {
    console.log('🟣 [ScssPartialsMetaboxes] handleMetaChange called:', {
      field,
      valueLength: value?.length,
      valuePreview: value?.substring(0, 100) + '...'
    });
    onChange('scss_partials', field, value);
  };

  const scssPartials = metaData?.scss_partials || {};

  useEffect(() => {
    console.log('🟣 [ScssPartialsMetaboxes] Component mounted/updated:', {
      selectedPostId: selectedPost?.id,
      selectedPostTitle: selectedPost?.title,
      scssPartialsData: scssPartials,
      scssContentLength: scssPartials.scss?.length,
      scssContentPreview: scssPartials.scss?.substring(0, 100) + '...'
    });
  }, [selectedPost?.id, scssPartials.scss]);

  return (
    <>
      {/* Header with Title */}
      <header className="flex-shrink-0 pb-4">
        {titleComponent}
      </header>

      {/* Content */}
      <div className="relative flex-1 min-h-0 [&>section]:!h-full">
        <MonacoEditor
          key={`scss-partial-${selectedPost?.id}`}
          value={scssPartials.scss || ''}
          onChange={(e) => handleMetaChange('scss', e.target.value)}
          language="scss"
          className="absolute inset-0"
          placeholder="Enter SCSS partial code..."
        />
      </div>
    </>
  );
};

export default ScssPartialsMetaboxes;