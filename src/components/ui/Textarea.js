import React from 'react';

const Textarea = ({
  id,
  name,
  value,
  onChange,
  placeholder = '',
  rows = 4,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseClasses = 'w-full px-3 py-2 border border-outline rounded-md bg-surface text-base font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`${baseClasses} ${disabledClasses} ${className}`}
      {...props}
    />
  );
};

export default Textarea;