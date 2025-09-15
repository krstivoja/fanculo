import React, { useState } from 'react';
import { MonacoEditor } from '../../ui';
import AttributesManager from '../attributes/AttributesManager';

const BlocksMetaboxes = ({ metaData, onChange, titleComponent }) => {
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
      {/* Header with Title and Tabs */}
      <header className="flex-shrink-0">
        {titleComponent}

        {/* Tab Navigation */}
        <div className='px-8 py-0'>
          <div className="p-0 border-b border-b-solid border-b-outline w-full flex">
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
      </header>

      {/* Tab Content */}
      <>
        {tabs.map(tab => (
          <div key={tab.id} className={`h-full relative border-[5px] border-solid border-[yellow] ${activeTab === tab.id ? 'block' : 'hidden'}`}>
            {tab.isAttributesTab ? (
              <div className="h-full p-8">
                <AttributesManager
                  blockMeta={metaData}
                  onMetaChange={onChange}
                  blockId="current-block"
                />
              </div>
            ) : (
              <MonacoEditor
                  value={blocks[tab.id] || ''}
                  onChange={(e) => handleMetaChange(tab.id, e.target.value)}
                  language={tab.language || 'plaintext'}
                  className="absolute inset-0"
                  placeholder={tab.placeholder}
                />
            )}
          </div>
        ))}
      </>
    </>
  );
};

export default BlocksMetaboxes;