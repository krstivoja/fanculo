import React from 'react';

const Input = ({ type = 'text', placeholder, value, onChange, className = '', ...props }) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`px-3 py-2 bg-base-alt border border-outline rounded-md text-contrast placeholder-contrast/60 focus:outline-none focus:ring-2 focus:ring-action/30 focus:border-action transition-colors ${className}`}
      {...props}
    />
  );
};

export default Input;