import React, { useState, useEffect } from 'react';
import { Modal, Input } from './';
import { dashicons } from '../../constants/dashicons';

const DashiconSelector = ({ isOpen, onClose, selectedIcon, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIcons, setFilteredIcons] = useState(dashicons);

  useEffect(() => {
    if (searchTerm) {
      const filtered = dashicons.filter(icon =>
        icon.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredIcons(filtered);
    } else {
      setFilteredIcons(dashicons);
    }
  }, [searchTerm]);

  const handleIconSelect = (icon) => {
    onSelect(icon);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Select Dashicon"
      onClose={onClose}
      size="large"
    >
      <div className="space-y-4">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search icons..."
        />

        <div className="grid grid-cols-6 gap-2 max-h-[400px] overflow-y-auto">
          {filteredIcons.map((icon) => (
            <button
              key={icon}
              type="button"
              className={`p-4 text-center rounded hover:bg-base-alt transition-colors ${
                selectedIcon === icon ? 'bg-accent text-base' : 'text-highlight'
              }`}
              onClick={() => handleIconSelect(icon)}
            >
              <span className={`dashicons dashicons-${icon} text-xl block mb-1`}></span>
              <div className="text-xs truncate">{icon}</div>
            </button>
          ))}
        </div>

        {filteredIcons.length === 0 && (
          <div className="text-center py-8 text-contrast">
            No icons found matching "{searchTerm}"
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DashiconSelector;