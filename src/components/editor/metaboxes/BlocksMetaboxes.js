import React, { useState } from 'react';
import { MonacoEditor, Textarea } from '../../ui';
import AttributesManager from '../attributes/AttributesManager';

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
    { id: 'attributes', label: 'Attributes', isAttributesTab: true }
  ];

  return (
    <>

      {/* Tab Navigation */}
      <div className='p-8 pt-0'>
        <div className="p-0 border-b border-b-solid border-b-outline w-full flex mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`p-4 !text-[1rem] text-contrast hover:text-highlight transition-colors ${
                activeTab === tab.id ? 'border-b-[2px] border-b-solid border-b-action !text-highlight' : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {tabs.map(tab => (
          <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
            {tab.isAttributesTab ? (
              <AttributesManager
                blockMeta={metaData}
                onMetaChange={onChange}
                blockId="current-block"
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
        ))}
      </div>
    </>
  );
};

export default BlocksMetaboxes;