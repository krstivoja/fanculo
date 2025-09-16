import React from 'react';

const ScssPartialsIcon = ({ size = 16, className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
    >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        <circle cx="8" cy="16" r="2"/>
        <circle cx="16" cy="16" r="2"/>
        <path d="M9 12h6v1H9z"/>
    </svg>
);

export default ScssPartialsIcon;