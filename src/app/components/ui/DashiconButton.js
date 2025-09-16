import React, { useState, Suspense, lazy } from 'react';
import { Button } from './';

const DashiconSelector = lazy(() => import('./DashiconSelector'));

const DashiconButton = ({ selectedIcon = 'search', onIconSelect, label = 'Block Dashicon' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleIconSelect = (icon) => {
    onIconSelect(icon);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-highlight">
          {label}
        </label>
        <Button
          variant="secondary"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <span className={`dashicons dashicons-${selectedIcon}`}></span>
          <span>{selectedIcon}</span>
        </Button>
      </div>

      {isModalOpen && (
        <Suspense fallback={null}>
          <DashiconSelector
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            selectedIcon={selectedIcon}
            onSelect={handleIconSelect}
          />
        </Suspense>
      )}
    </>
  );
};

export default DashiconButton;