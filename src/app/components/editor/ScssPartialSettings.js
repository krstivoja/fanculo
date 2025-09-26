import React, { useState, useEffect } from 'react';
import { Toggle } from '../ui';

const ScssPartialSettings = ({ selectedPost, metaData, onMetaChange }) => {
  const [isGlobal, setIsGlobal] = useState(false);
  const [globalOrder, setGlobalOrder] = useState(1);

  const scssPartials = metaData?.scss_partials || {};

  // Load global settings from metaData
  useEffect(() => {
    if (scssPartials.is_global !== undefined) {
      setIsGlobal(scssPartials.is_global === '1' || scssPartials.is_global === 1);
    }
    if (scssPartials.global_order !== undefined) {
      const order = parseInt(scssPartials.global_order) || 1;
      setGlobalOrder(order);
    }
  }, [scssPartials.is_global, scssPartials.global_order]);

  // Update metaData when settings change (requires save button - no immediate API call)
  const updateGlobalSettings = (newIsGlobal, newGlobalOrder) => {
    if (onMetaChange) {
      // Update the is_global field
      onMetaChange('scss_partials', 'is_global', newIsGlobal ? '1' : '0');
      // Update the global_order field
      onMetaChange('scss_partials', 'global_order', String(newGlobalOrder));
    }
  };

  const handleGlobalToggle = () => {
    const newGlobalValue = !isGlobal;
    setIsGlobal(newGlobalValue);
    updateGlobalSettings(newGlobalValue, globalOrder);
  };

  const handleGlobalOrderChange = (e) => {
    const newOrder = parseInt(e.target.value) || 1;
    setGlobalOrder(newOrder);
    updateGlobalSettings(isGlobal, newOrder);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-outline">
      <h4 className="font-medium text-highlight">Global Settings</h4>

      <div className="space-y-3">
        <Toggle
          checked={isGlobal}
          onChange={handleGlobalToggle}
          label="🌍 Global partial (auto-include in all blocks)"
        />

        {isGlobal && (
          <div className="ml-6">
            <label className="block text-sm font-medium text-contrast mb-1">
              Load Order
            </label>
            <input
              type="number"
              value={globalOrder}
              onChange={handleGlobalOrderChange}
              min="1"
              className="w-20 px-2 py-1 text-sm border border-outline rounded bg-base-2 text-highlight"
            />
            <p className="text-xs text-contrast mt-1">
              Lower numbers load first
            </p>
          </div>
        )}

        <p className="text-xs text-contrast">
          Global partials are automatically included in all blocks
        </p>
      </div>
    </div>
  );
};

export default ScssPartialSettings;