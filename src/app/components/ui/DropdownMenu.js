import React, { useState, useRef, useEffect } from 'react';

const DropdownMenu = ({ trigger, children, align = 'end' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const alignmentClasses = align === 'start' ? 'left-0' : 'right-0';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute ${alignmentClasses} mt-2 w-56 z-50 rounded border border-outline bg-base-2 shadow-lg opacity-100 scale-100 transition-all duration-100`}
        >
          <div className="py-1">
            {React.Children.map(children, child =>
              React.cloneElement(child, {
                onClick: (e) => {
                  child.props.onClick?.(e);
                  setIsOpen(false);
                }
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DropdownMenuItem = ({ children, onClick, href, className = '' }) => {
  const content = (
    <>
      {children}
    </>
  );

  const baseClasses = 'relative flex cursor-pointer select-none items-center px-4 py-2 text-sm text-contrast hover:bg-outline hover:text-highlight transition-colors outline-none';

  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} ${className}`}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      onClick={onClick}
      role="menuitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
    >
      {content}
    </div>
  );
};

const DropdownMenuSeparator = () => (
  <div className="my-1 h-px bg-outline" />
);

const DropdownMenuLabel = ({ children, className = '' }) => (
  <div className={`px-4 py-2 text-xs font-semibold text-base-3 ${className}`}>
    {children}
  </div>
);

export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel };
