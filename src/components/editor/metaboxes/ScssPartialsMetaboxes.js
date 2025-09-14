import React from 'react';
import MetaboxTextarea from './MetaboxTextarea';

const ScssPartialsMetaboxes = ({ metaData, onChange }) => {
  const handleMetaChange = (field, value) => {
    onChange('scss_partials', field, value);
  };

  const scssPartials = metaData?.scss_partials || {};

  return (
    <div className="space-y-4">

      <MetaboxTextarea
        label="SCSS Code"
        name="scss"
        value={scssPartials.scss}
        onChange={(value) => handleMetaChange('scss', value)}
        placeholder="Enter SCSS partial code..."
        rows={10}
        language="scss"
        required
      />
    </div>
  );
};

export default ScssPartialsMetaboxes;