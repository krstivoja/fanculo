import React, { useState } from 'react';
import { Textarea } from '../../ui';

const MetaboxTextarea = ({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  rows = 6,
  language = '',
  required = false
}) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };


  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>


      <Textarea
        name={name}
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className={language ? `language-${language}` : ''}
      />
    </div>
  );
};

export default MetaboxTextarea;