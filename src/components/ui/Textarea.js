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
  const baseClasses = 'w-full !bg-base-2 !text-contrast';
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