import React from 'react';

const Toggle = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'medium',
  className = '',
  id,
  ...props
}) => {
  const getSizeClasses = (size) => {
    switch (size) {
      case 'small':
        return {
          track: 'w-8 h-4',
          thumb: 'w-3 h-3 after:top-[2px] after:left-[2px] peer-checked:after:translate-x-4'
        };
      case 'large':
        return {
          track: 'w-14 h-7',
          thumb: 'w-6 h-6 after:top-[2px] after:left-[2px] peer-checked:after:translate-x-7'
        };
      case 'medium':
      default:
        return {
          track: 'w-11 h-6',
          thumb: 'w-5 h-5 after:top-[2px] after:left-[2px] peer-checked:after:translate-x-5'
        };
    }
  };

  const sizeClasses = getSizeClasses(size);
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <label htmlFor={toggleId} className="relative inline-flex items-center cursor-pointer">
        <input
          id={toggleId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div className={`
          ${sizeClasses.track}
          bg-base-2
          peer-focus:outline-none
          peer-focus:ring-4
          peer-focus:ring-action/20
          rounded-full
          peer
          peer-checked:after:border-white
          after:content-['']
          after:absolute
          ${sizeClasses.thumb}
          after:bg-white
          after:border-outline
          after:border
          after:rounded-full
          after:transition-all
          peer-checked:bg-action
          peer-disabled:opacity-50
          peer-disabled:cursor-not-allowed
          transition-colors
        `}></div>
      </label>
      {label && (
        <label
          htmlFor={toggleId}
          className={`text-sm font-medium text-highlight select-none ${
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Toggle;