import React, { useState, useEffect } from 'react';

// Hardcoded taxonomy terms - they won't change
const TAXONOMY_TERMS = [
    { slug: 'blocks', name: 'Blocks', icon: '🧱', color: '#00a32a' },
    { slug: 'symbols', name: 'Symbols', icon: '🔣', color: '#ff6900' },
    { slug: 'scss-partials', name: 'SCSS Partials', icon: '🎨', color: '#8e44ad' }
];

const EditorList = ({ groupedPosts }) => {
  const totalPosts = groupedPosts.blocks.length + groupedPosts.symbols.length + groupedPosts['scss-partials'].length;

  return (
    <aside id="editor-list">
      <h2>Fanculo Posts ({totalPosts})</h2>

      {TAXONOMY_TERMS.map(term => (
        <div key={term.slug} className="mb-6">
          <h3 className="text-lg font-semibold mb-2" style={{ color: term.color }}>
            <span className="mr-2">{term.icon}</span>
            {term.name} ({groupedPosts[term.slug].length})
          </h3>
          {groupedPosts[term.slug].length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {groupedPosts[term.slug].map(post => (
                <li key={post.id}>{post.title.rendered}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No {term.name.toLowerCase()} found</p>
          )}
        </div>
      ))}
    </aside>
  );
};

export default EditorList;