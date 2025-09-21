import React from 'react';

const Toggle = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  id,
  ...props
}) => {
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  return (
    
      <label htmlFor={toggleId} className={`flex cursor-pointer items-center text-contrast select-none gap-3 ${className}`}>
        <div className="relative ">
          <input
            id={toggleId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="peer sr-only "
            {...props}
          />
          <div className="block h-6 w-10 rounded-full bg-base-1 peer-checked:bg-action/20 border border-solid border-contrast/30 peer-checked:border-action/30"></div>
          <div className="dot absolute top-1 left-1 h-4 w-4 rounded-full bg-contrast transition peer-checked:translate-x-full peer-checked:bg-action"></div>
        </div>
        {label && (
          <span className={`text-sm font-medium text-highlight select-none ${
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}>
            {label}
          </span>
        )}
      </label>
  );
};

export default Toggle;