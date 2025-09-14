import React, { useState } from 'react';
import MetaboxTextarea from './MetaboxTextarea';
import { Button } from '../../ui';

const BlocksMetaboxes = ({ metaData, onChange }) => {
  const [activeTab, setActiveTab] = useState('php');

  const handleMetaChange = (field, value) => {
    onChange('blocks', field, value);
  };

  const blocks = metaData?.blocks || {};

  const tabs = [
    { id: 'php', label: 'PHP', language: 'php', rows: 8, required: true, placeholder: 'Enter PHP code for the block...' },
    { id: 'scss', label: 'SCSS', language: 'scss', rows: 6, placeholder: 'Enter SCSS styles for the block...' },
    { id: 'js', label: 'JavaScript', language: 'js', rows: 6, placeholder: 'Enter JavaScript code for the block...' },
    { id: 'attributes', label: 'Attributes', language: 'json', rows: 4, placeholder: '{"attribute": {"type": "string", "default": ""}}' }
  ];

  return (
    <div className="space-y-4">

      {/* Tab Navigation */}
      <div className="flex p-1 border border-solid border-outline rounded-md bg-base-alt">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            className="grow"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {tabs.map(tab => (
          <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
            <MetaboxTextarea
              label={`${tab.label} Code`}
              name={tab.id}
              value={blocks[tab.id]}
              onChange={(value) => handleMetaChange(tab.id, value)}
              placeholder={tab.placeholder}
              rows={tab.rows}
              language={tab.language}
              required={tab.required}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlocksMetaboxes;