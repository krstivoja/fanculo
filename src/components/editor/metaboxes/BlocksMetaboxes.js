import React, { useState } from 'react';
import { Button, MonacoEditor, Textarea } from '../../ui';

const BlocksMetaboxes = ({ metaData, onChange }) => {
  const [activeTab, setActiveTab] = useState('php');

  const handleMetaChange = (field, value) => {
    onChange('blocks', field, value);
  };

  const blocks = metaData?.blocks || {};

  const tabs = [
    { id: 'php', label: 'PHP', language: 'php', required: true, placeholder: 'Enter PHP code for the block...' },
    { id: 'scss', label: 'SCSS', language: 'scss', placeholder: 'Enter SCSS styles for the block...' },
    { id: 'js', label: 'JavaScript', language: 'javascript', placeholder: 'Enter JavaScript code for the block...' },
    { id: 'attributes', label: 'Attributes', language: 'json', placeholder: '{"attribute": {"type": "string", "default": ""}}' }
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
      <div className="min-h-[300px]">
        {tabs.map(tab => (
          <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-highlight">
                {tab.label} {tab.id === 'attributes' ? '' : 'Code'} {tab.required && <span className="text-red-500">*</span>}
              </label>
              {tab.id === 'attributes' ? (
                <Textarea
                  value={blocks[tab.id] || ''}
                  onChange={(e) => handleMetaChange(tab.id, e.target.value)}
                  placeholder={tab.placeholder}
                  rows={6}
                />
              ) : (
                <MonacoEditor
                  value={blocks[tab.id] || ''}
                  onChange={(e) => handleMetaChange(tab.id, e.target.value)}
                  language={tab.language || 'plaintext'}
                  height="300px"
                  placeholder={tab.placeholder}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlocksMetaboxes;