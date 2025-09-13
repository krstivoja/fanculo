import React, { useState, useRef, useEffect } from 'react'

const NewPostButton = ({ onNewPost }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const postTypes = [
    {
      slug: 'blocks',
      name: 'Block',
      icon: '🧱',
      color: '#00a32a'
    },
    {
      slug: 'symbols',
      name: 'Symbol',
      icon: '🔣',
      color: '#ff6900'
    },
    {
      slug: 'scss-partials',
      name: 'SCSS Partial',
      icon: '🎨',
      color: '#8e44ad'
    }
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handlePostTypeSelect = (postType) => {
    setIsOpen(false)
    onNewPost(postType)
  }

  return (
    <div className="new-post-button-container" ref={dropdownRef}>
      <button
        className="new-post-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="new-icon">➕</span>
        <span className="new-text">New</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="new-post-dropdown">
          {postTypes.map((type) => (
            <button
              key={type.slug}
              className="dropdown-option"
              onClick={() => handlePostTypeSelect(type)}
              style={{ '--type-color': type.color }}
            >
              <span className="option-icon">{type.icon}</span>
              <span className="option-name">{type.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default NewPostButton