import React from 'react';
import Icon from './Icon';

const SymbolsIcon = ({ size = 16, className = '' }) => (
  <Icon
    size={size}
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    paths={[
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
      "M8 14h8v2H8z"
    ]}
  >
    <circle cx="12" cy="8" r="2" fill="currentColor" />
  </Icon>
);

export default SymbolsIcon;