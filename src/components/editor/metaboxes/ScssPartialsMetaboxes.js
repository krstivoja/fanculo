import React from 'react';
import { MonacoEditor } from '../../ui';

const ScssPartialsMetaboxes = ({ metaData, onChange }) => {
  const handleMetaChange = (field, value) => {
    onChange('scss_partials', field, value);
  };

  const scssPartials = metaData?.scss_partials || {};

  return (
    <MonacoEditor
      value={scssPartials.scss || ''}
      onChange={(e) => handleMetaChange('scss', e.target.value)}
      language="scss"
      height="400px"
      placeholder="Enter SCSS partial code..."
    />
  );
};

export default ScssPartialsMetaboxes;