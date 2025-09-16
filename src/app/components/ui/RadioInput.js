import React from 'react';

const RadioInput = ({ name, value, checked, onChange, className = '', ...props }) => {
  return (
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className={`radio-input ${className}`}
      {...props}
    />
  );
};

export default RadioInput;
 