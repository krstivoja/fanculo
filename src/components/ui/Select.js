import React from 'react';

const Select = ({ value, onChange, options, placeholder, className = '', error, disabled, ...props }) => {
  return (
    <div className="w-full">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={` ${className}`}
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