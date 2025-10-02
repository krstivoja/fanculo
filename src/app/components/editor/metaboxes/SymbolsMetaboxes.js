import React from 'react';
import { MonacoEditor } from '../../ui';

const SymbolsMetaboxes = ({ metaData, onChange, titleComponent, selectedPost }) => {
  const handleMetaChange = (field, value) => {
    onChange('symbols', field, value);
  };

  const symbols = metaData?.symbols || {};

  return (
    <>
      {/* Header with Title */}
      <header className="flex-shrink-0 pb-4">
        {titleComponent}
      </header>

      {/* Content */}
      <div className="relative flex-1 min-h-0 [&>section]:!h-full">
        <MonacoEditor
          key={`symbol-${selectedPost?.id}`}
          value={symbols.php || ''}
          onChange={(e) => handleMetaChange('php', e.target.value)}
          language="php"
          className="absolute inset-0"
          placeholder="Enter PHP code for the symbol..."
          enableEmmet={true}
          enablePhpHtmlSwitching={true}
        />
      </div>
    </>
  );
};

export default SymbolsMetaboxes;