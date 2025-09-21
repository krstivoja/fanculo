import React from 'react';

const Hr = ({ className = '', ...props }) => {
  return (
    <>
      <hr
        className={`h-[1px] font-size-[0] !border-0 bg-base-3/50 my-6 ${className}`}
        {...props}
      />     
    </>
  );
};

export default Hr;