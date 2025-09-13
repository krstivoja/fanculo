import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const getVariantClasses = (variant) => {
    switch (variant) {
      case 'primary':
        return 'bg-action text-highlight hover:bg-action/80 border-action';
      case 'secondary':
        return 'bg-transparent text-contrast border-outline hover:bg-outline hover:text-highlight';
      case 'ghost':
        return 'bg-transparent text-contrast border-transparent hover:bg-outline hover:text-highlight';
      case 'destroy':
        return 'bg-red-600 text-white hover:bg-red-700 border-red-600';
      default:
        return 'bg-action text-highlight hover:bg-action/80 border-action';
    }
  };

  return (
    <button
      className={`px-4 py-2 rounded border transition-colors ${getVariantClasses(variant)} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;