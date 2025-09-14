import React from 'react';

const Modal = ({ isOpen, onClose, children, title }) => {
  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-base border border-outline rounded-lg shadow-2xl max-w-md w-full z-10 animate-in fade-in duration-200">
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