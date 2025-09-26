import React, { useState } from 'react';
import { MonacoEditor } from '../../ui';
import AttributesManager from '../attributes/AttributesManager';
import { useBlockMetaData } from '../../../hooks';

const BlocksMetaboxes = ({ titleComponent }) => {
  const [activeTab, setActiveTab] = useState('php');
  const { data: blocks, updateField } = useBlockMetaData();

  const handleMetaChange = (field, value) => {
    updateField(field, value);
  };

  const handleAttributesChange = (_section, field, value) => {
    updateField(field, value);
  };

  const tabs = [
    { id: 'php', label: 'Content', language: 'php', required: true, placeholder: 'Enter PHP code for the block...' },
    { id: 'scss', label: 'Style', language: 'scss', placeholder: 'Enter SCSS styles for the block...' },
    { id: 'editorScss', label: 'Editor Style', language: 'scss', placeholder: 'Enter SCSS styles for the block editor...' },
    { id: 'js', label: 'View', language: 'javascript', placeholder: 'Enter JavaScript code for the block...' },
    { id: 'attributes', label: 'Attributes', isAttributesTab: true }
  ];

  return (
    <>
      {/* Header with Title and Tabs */}
      <header className="flex-shrink-0">
        {titleComponent}

        {/* Tab Navigation */}
        <div className='p-8 pt-0'>
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
          <div key={tab.id} className={`h-full relative [&>section]:!h-full ${activeTab === tab.id ? 'block' : 'hidden'}`}>
            {tab.isAttributesTab ? (
              <div className="h-full p-8">
                <AttributesManager
                  blockMeta={{ blocks }}
                  onMetaChange={handleAttributesChange}
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
