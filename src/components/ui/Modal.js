import React from 'react';

const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-base border border-outline rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-outline">
            <h2 className="text-lg font-semibold text-highlight">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;