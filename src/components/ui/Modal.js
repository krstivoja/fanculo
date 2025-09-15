import React from 'react';

const Modal = ({ isOpen, onClose, children, title, size = 'default' }) => {
  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'max-w-[400px]';
      case 'medium':
        return 'max-w-[800px]';
      case 'large':
        return 'max-w-[1200px]';
      default:
        return 'max-w-[500px]';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-base-1 border border-outline rounded-lg shadow-2xl ${getSizeClasses()} w-full z-10 animate-in fade-in duration-200`}>
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