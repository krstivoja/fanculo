import React from 'react';
import { MonacoEditor } from '../../ui';
import { useScssPartialMetaData } from '../../../hooks';

const ScssPartialsMetaboxes = ({ titleComponent }) => {
  const { data: scssPartials, updateField } = useScssPartialMetaData();

  const handleMetaChange = (field, value) => {
    updateField(field, value);
  };

  return (
    <>
      {/* Header with Title */}
      <header className="flex-shrink-0 pb-4">
        {titleComponent}
      </header>

      {/* Content */}
      <div className="relative flex-1 min-h-0 [&>section]:!h-full">
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