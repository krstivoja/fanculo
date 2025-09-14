import React from 'react';
import { MonacoEditor } from '../../ui';

const ScssPartialsMetaboxes = ({ metaData, onChange }) => {
  const handleMetaChange = (field, value) => {
    onChange('scss_partials', field, value);
  };

  const scssPartials = metaData?.scss_partials || {};

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b border-outline pb-2">
        SCSS Partial Configuration
      </h3>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-highlight">
          SCSS Code <span className="text-red-500">*</span>
        </label>
        <MonacoEditor
          value={scssPartials.scss || ''}
          onChange={(e) => handleMetaChange('scss', e.target.value)}
          language="scss"
          height="400px"
          placeholder="Enter SCSS partial code..."
        />
      </div>
    </div>
  );
};

export default ScssPartialsMetaboxes;