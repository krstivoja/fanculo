import React from 'react';
import Icon from './Icon';

const BlocksIcon = ({ size = 16, className = '' }) => (
  <Icon
    size={size}
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    paths="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-5h7v5zm8-5h-7V7h7v5z"
  />
);

export default BlocksIcon;