import React from 'react';

/**
 * Generic Icon component to reduce duplication
 * @param {number} size - Icon size (default: 16)
 * @param {string} className - CSS class name
 * @param {string} viewBox - SVG viewBox (default: "0 0 16 16")
 * @param {string} fill - SVG fill attribute (default: "none")
 * @param {string|Array} paths - SVG path data (string for single path, array for multiple paths)
 * @param {Array} children - Additional SVG elements (circles, etc.)
 */
const Icon = ({ size = 16, className = '', viewBox = '0 0 16 16', fill = 'none', paths, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill={fill}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {Array.isArray(paths) ? (
      paths.map((path, index) => (
        <path key={index} d={path} fill="currentColor" />
      ))
    ) : (
      <path d={paths} fill="currentColor" />
    )}
    {children}
  </svg>
);

export default Icon;