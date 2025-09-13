import React, { useState, useEffect } from 'react';

// Hardcoded taxonomy terms - they won't change
const TAXONOMY_TERMS = [
    { slug: 'blocks', name: 'Blocks' },
    { slug: 'symbols', name: 'Symbols' },
    { slug: 'scss-partials', name: 'SCSS Partials'  }
];

const EditorList = ({ groupedPosts }) => {
  const [activeTab, setActiveTab] = useState('blocks');
  const totalPosts = groupedPosts.blocks.length + groupedPosts.symbols.length + groupedPosts['scss-partials'].length;

  return (
    <aside id="editor-list">
      {/* <h2>Fanculo Posts ({totalPosts})</h2> */}

      {/* Tab Navigation */}
      <div className="tab-nav">
        {TAXONOMY_TERMS.map(term => (
          <button
            key={term.slug}
            className={`tab-button ${activeTab === term.slug ? 'active' : ''}`}
            onClick={() => setActiveTab(term.slug)}
            style={{
              borderBottomColor: activeTab === term.slug ? term.color : 'transparent',
              color: activeTab === term.slug ? term.color : '#666'
            }}
          >
            {term.name} ({groupedPosts[term.slug].length})
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {TAXONOMY_TERMS.map(term => (
          <div
            key={term.slug}
            className={`tab-panel ${activeTab === term.slug ? 'active' : ''}`}
          >
            {activeTab === term.slug && (
              <>
                {groupedPosts[term.slug].length > 0 ? (
                  <ul className="post-list">
                    {groupedPosts[term.slug].map(post => (
                      <li key={post.id} className="post-item">
                        {post.title.rendered}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">No {term.name.toLowerCase()} found</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default EditorList;