import React from 'react';
import MetaboxTextarea from './MetaboxTextarea';

const BlocksMetaboxes = ({ metaData, onChange }) => {
  const handleMetaChange = (field, value) => {
    onChange('blocks', field, value);
  };

  const blocks = metaData?.blocks || {};

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b border-outline pb-2">
        Block Configuration
      </h3>

      <MetaboxTextarea
        label="PHP Code"
        name="php"
        value={blocks.php}
        onChange={(value) => handleMetaChange('php', value)}
        placeholder="Enter PHP code for the block..."
        rows={8}
        language="php"
        required
      />

      <MetaboxTextarea
        label="SCSS Styles"
        name="scss"
        value={blocks.scss}
        onChange={(value) => handleMetaChange('scss', value)}
        placeholder="Enter SCSS styles for the block..."
        rows={6}
        language="scss"
      />

      <MetaboxTextarea
        label="JavaScript"
        name="js"
        value={blocks.js}
        onChange={(value) => handleMetaChange('js', value)}
        placeholder="Enter JavaScript code for the block..."
        rows={6}
        language="js"
      />

      <MetaboxTextarea
        label="Block Attributes"
        name="attributes"
        value={blocks.attributes}
        onChange={(value) => handleMetaChange('attributes', value)}
        placeholder='{"attribute": {"type": "string", "default": ""}}'
        rows={4}
        language="json"
      />

      <MetaboxTextarea
        label="Block Settings"
        name="settings"
        value={blocks.settings}
        onChange={(value) => handleMetaChange('settings', value)}
        placeholder="Additional block settings..."
        rows={4}
      />
    </div>
  );
};

export default BlocksMetaboxes;