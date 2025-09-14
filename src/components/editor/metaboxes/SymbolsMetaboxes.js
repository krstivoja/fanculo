import React from 'react';
import { MonacoEditor } from '../../ui';

const SymbolsMetaboxes = ({ metaData, onChange }) => {
  const handleMetaChange = (field, value) => {
    onChange('symbols', field, value);
  };

  const symbols = metaData?.symbols || {};

  return (
    <MonacoEditor
      value={symbols.php || ''}
      onChange={(e) => handleMetaChange('php', e.target.value)}
      language="php"
      height="400px"
      placeholder="Enter PHP code for the symbol..."
    />
  );
};

export default SymbolsMetaboxes;