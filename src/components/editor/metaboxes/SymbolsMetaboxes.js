import React from 'react';
import MetaboxTextarea from './MetaboxTextarea';

const SymbolsMetaboxes = ({ metaData, onChange }) => {
  const handleMetaChange = (field, value) => {
    onChange('symbols', field, value);
  };

  const symbols = metaData?.symbols || {};

  return (
    <div className="space-y-4">

      <MetaboxTextarea
        label="PHP Code"
        name="php"
        value={symbols.php}
        onChange={(value) => handleMetaChange('php', value)}
        placeholder="Enter PHP code for the symbol..."
        rows={10}
        language="php"
        required
      />
    </div>
  );
};

export default SymbolsMetaboxes;