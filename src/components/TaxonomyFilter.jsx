import React from 'react'

const TaxonomyTabs = ({ terms, selectedTerm, onTermSelect }) => {
  const getTermIcon = (termSlug) => {
    switch (termSlug) {
      case 'blocks':
        return '🧱'
      case 'symbols':
        return '🔣'
      case 'scss-partials':
        return '🎨'
      default:
        return '📄'
    }
  }

  const getTermColor = (termSlug) => {
    switch (termSlug) {
      case 'blocks':
        return '#00a32a'
      case 'symbols':
        return '#ff6900'
      case 'scss-partials':
        return '#8e44ad'
      default:
        return '#007cba'
    }
  }

  return (
    <div className="taxonomy-tabs">
      <div className="tab-list">
        {terms.map((term) => (
          <button
            key={term.id}
            className={`tab-button ${selectedTerm === term.slug ? 'active' : ''}`}
            onClick={() => onTermSelect(term.slug)}
            style={{ '--term-color': getTermColor(term.slug) }}
          >
            <span className="tab-icon">{getTermIcon(term.slug)}</span>
            <span className="tab-name">{term.name}</span>
            <span className="tab-count">{term.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TaxonomyTabs