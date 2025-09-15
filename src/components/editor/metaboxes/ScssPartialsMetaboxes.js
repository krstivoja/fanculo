import React from 'react';
import { MonacoEditor } from '../../ui';

const ScssPartialsMetaboxes = ({ metaData, onChange, titleComponent }) => {
  const handleMetaChange = (field, value) => {
    onChange('scss_partials', field, value);
  };

  const scssPartials = metaData?.scss_partials || {};

  return (
    <>
      {/* Header with Title */}
      <header className="flex-shrink-0">
        {titleComponent}
      </header>

      {/* Content */}
      <div className="relative flex-1 min-h-0">
        <MonacoEditor
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