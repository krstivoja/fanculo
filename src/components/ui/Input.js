import React from 'react';

const Input = ({ type = 'text', placeholder, value, onChange, className = '', error, ...props }) => {
  return (
    <div className="w-full">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`px-3 py-2 bg-base-alt border rounded-md text-contrast placeholder-contrast/60 focus:outline-none focus:ring-2 focus:ring-action/30 transition-colors w-full ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-outline focus:border-action'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-warning">⚠︎ {error}</p>
      )}
    </div>
  );
};

export default Input;