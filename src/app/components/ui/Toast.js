import React, { useEffect, useState } from 'react';

const Toast = ({
  message,
  type = 'error',
  isVisible,
  onClose,
  duration = 5000,
  title = null
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);

      // Auto-close after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    // Allow animation to complete before hiding
    setTimeout(() => {
      onClose();
    }, 300);
  };


  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          container: 'bg-[#f5d6d6] text-[#5c0808]',
          content: 'text-[#5c0808] bg-[#ffeaea]'
        };
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          content: 'text-green-700 bg-green-100'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          content: 'text-yellow-700 bg-yellow-100'
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          content: 'text-blue-700 bg-blue-100'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-[9999999999] transition-all duration-300 ${isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}>
      <div className={`${styles.container} rounded-lg p-4 !overflow-hidden relative `}>

        <div className="flex-1 min-w-0">
          <div className="flex gap-2 items-center mb-4">
            {styles.icon}
            {title && (
              <h3 className={`font-medium !m-0 !text-inherit`}>
                {title}
              </h3>
            )}
          </div>
          <div className={`text-xs ${styles.content} p-2 rounded font-mono whitespace-pre-wrap `}>
            {message}
          </div>
        </div>
        <button
          onClick={handleClose}
          className={`${styles.iconColor} hover:opacity-70 flex-shrink-0 text-lg leading-none absolute top-2 right-2`}
          title="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;