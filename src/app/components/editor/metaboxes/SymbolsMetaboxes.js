import React from 'react';
import { MonacoEditor } from '../../ui';
import { useSymbolMetaData } from '../../../hooks';

const SymbolsMetaboxes = ({ titleComponent }) => {
  const { data: symbols, updateField } = useSymbolMetaData();

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