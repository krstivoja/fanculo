import React from 'react';
import { MonacoEditor } from '../../ui';

const SymbolsMetaboxes = ({ metaData, onChange, titleComponent }) => {
  const handleMetaChange = (field, value) => {
    onChange('symbols', field, value);
  };

  const symbols = metaData?.symbols || {};

  return (
    <>
      {/* Header with Title */}
      <header className="flex-shrink-0">
        {titleComponent}
      </header>

      {/* Content */}
      <div className="relative flex-1 min-h-0">
        <MonacoEditor
          value={symbols.php || ''}
          onChange={(e) => handleMetaChange('php', e.target.value)}
          language="php"
          className="absolute inset-0"
          placeholder="Enter PHP code for the symbol..."
        />
      </div>
    </>
  );
};

export default SymbolsMetaboxes;