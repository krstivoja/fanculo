import React from 'react';
import { MonacoEditor } from '../../ui';

const SymbolsMetaboxes = ({ metaData, onChange }) => {
  const handleMetaChange = (field, value) => {
    onChange('symbols', field, value);
  };

  const symbols = metaData?.symbols || {};

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b border-outline pb-2">
        Symbol Configuration
      </h3>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-highlight">
          PHP Code <span className="text-red-500">*</span>
        </label>
        <MonacoEditor
          value={symbols.php || ''}
          onChange={(e) => handleMetaChange('php', e.target.value)}
          language="php"
          height="400px"
          placeholder="Enter PHP code for the symbol..."
        />
      </div>
    </div>
  );
};

export default SymbolsMetaboxes;