import React, { useState, useEffect } from 'react';
import { MonacoEditor, Button } from '../../ui';
import apiClient from '../../../../utils/FunculoApiClient.js';

const ScssPartialsMetaboxes = ({ metaData, onChange, titleComponent, selectedPost }) => {
  const [isGlobal, setIsGlobal] = useState(false);
  const [globalOrder, setGlobalOrder] = useState(1);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  const handleMetaChange = (field, value) => {
    onChange('scss_partials', field, value);
  };

  const scssPartials = metaData?.scss_partials || {};

  // Load global settings on component mount
  useEffect(() => {
    if (selectedPost?.id) {
      loadGlobalSettings();
    }
  }, [selectedPost?.id]);

  const loadGlobalSettings = async () => {
    try {
      const post = await apiClient.getPost(selectedPost.id);
      const globalSetting = post.meta?.funculo_scss_is_global?.[0];
      const globalOrderSetting = post.meta?.funculo_scss_global_order?.[0];

      setIsGlobal(globalSetting === '1');
      setGlobalOrder(globalOrderSetting ? parseInt(globalOrderSetting) : 1);
    } catch (error) {
      console.error('Error loading global settings:', error);
    }
  };

  const handleGlobalToggle = async () => {
    const newGlobalValue = !isGlobal;
    setIsSavingGlobal(true);

    try {
      const result = await apiClient.updatePartialGlobalSettings(selectedPost.id, {
        is_global: newGlobalValue,
        global_order: globalOrder
      });
      console.log('Global setting save response:', result);
      setIsGlobal(newGlobalValue);
      console.log(`SCSS partial ${newGlobalValue ? 'enabled' : 'disabled'} globally`);
    } catch (error) {
      console.error('Error updating global setting:', error);
      alert('Failed to update global setting: ' + error.message);
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const handleGlobalOrderChange = async (newOrder) => {
    setGlobalOrder(newOrder);

    if (isGlobal) {
      try {
        await apiClient.updatePartialGlobalSettings(selectedPost.id, {
          is_global: true,
          global_order: newOrder
        });
      } catch (error) {
        console.error('Error updating global order:', error);
      }
    }
  };

  return (
    <>
      {/* Header with Title */}
      <header className="flex-shrink-0 pb-4">
        {titleComponent}
      </header>

      {/* Global Settings */}
      <div className="px-8 pb-4 border-b border-outline">
        <div className="bg-base-2 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3 text-highlight">Global Settings</h3>

          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={handleGlobalToggle}
                disabled={isSavingGlobal}
                className="rounded border-outline bg-transparent"
              />
              <span className="text-sm">
                🌍 Global partial (auto-include in all blocks)
              </span>
            </label>
          </div>

          {isGlobal && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-contrast">Global Order:</label>
              <input
                type="number"
                min="1"
                max="100"
                value={globalOrder}
                onChange={(e) => handleGlobalOrderChange(parseInt(e.target.value))}
                className="w-20 px-2 py-1 text-sm border border-outline rounded bg-transparent"
              />
              <span className="text-xs text-contrast">
                (Lower numbers = imported first)
              </span>
            </div>
          )}

          <div className="mt-2 text-xs text-contrast">
            {isGlobal ? (
              <span className="text-action">✅ This partial will be automatically included in all blocks</span>
            ) : (
              <span>This partial is available for manual selection in blocks</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 min-h-0 [&>section]:!h-full">
        <MonacoEditor
          value={scssPartials.scss || ''}
          onChange={(e) => handleMetaChange('scss', e.target.value)}
          language="scss"
          className="absolute inset-0"
          placeholder="Enter SCSS partial code..."
        />
      </div>
    </>
  );
};

export default ScssPartialsMetaboxes;