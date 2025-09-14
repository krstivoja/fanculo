import React from 'react';

const Select = ({ value, onChange, options, placeholder, className = '', error, disabled, ...props }) => {
  return (
    <div className="w-full">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`px-3 py-2 bg-base-alt border rounded-md text-contrast focus:outline-none focus:ring-2 focus:ring-action/30 transition-colors w-full ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-outline focus:border-action'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
};

export default Select;