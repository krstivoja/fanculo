import React, { useState, useEffect } from 'react';
import { TAXONOMY_TERMS } from '../../constants/taxonomy';

const EditorList = ({ groupedPosts, selectedPost, onPostSelect }) => {
  const [activeTab, setActiveTab] = useState('blocks');
  const totalPosts = groupedPosts.blocks.length + groupedPosts.symbols.length + groupedPosts['scss-partials'].length;

  return (
    <aside id="editor-list" className='flex flex-col h-full border-r border-solid border-outline w-[400px]'>
      {/* <h2>Fanculo Posts ({totalPosts})</h2> */}

      {/* Tab Navigation */}
      <div className='p-3'>
        <div className="flex p-1 border border-solid border-outline rounded-md">
          {TAXONOMY_TERMS.map(term => (
            <button
              key={term.slug}
              className={`p-2 px-4 rounded-md grow  ${activeTab === term.slug ? '!text-highlight bg-action' : ''}`}
              onClick={() => setActiveTab(term.slug)}
            >
              {term.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0 px-4 pb-4">
        {TAXONOMY_TERMS.map(term => (
          <div
            key={term.slug}
            className={`h-full ${activeTab === term.slug ? 'block' : 'hidden'}`}
          >
            {groupedPosts[term.slug].length > 0 ? (
              <ul className="overflow-y-auto h-full">
                {groupedPosts[term.slug].map(post => (
                  <li
                    key={post.id}
                    onClick={() => onPostSelect(post)}
                    className={`cursor-pointer p-2 rounded ${
                      selectedPost?.id === post.id
                        ? 'bg-action text-highlight hover:bg-action'
                        : 'hover:bg-action/10'
                    }`}
                  >
                    {post.title.rendered}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No {term.name.toLowerCase()} found</p>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default EditorList;