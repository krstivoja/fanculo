import React, { useState, useEffect } from 'react';
import { TAXONOMY_TERMS } from '../../constants/taxonomy';
import { Button } from '../ui';

const EditorList = ({ groupedPosts, selectedPost, onPostSelect }) => {
  const [activeTab, setActiveTab] = useState('blocks');
  const totalPosts = groupedPosts.blocks.length + groupedPosts.symbols.length + groupedPosts['scss-partials'].length;

  // Get the appropriate icon for a post
  const getPostIcon = (post, termSlug) => {
    // For blocks, check if there's a custom icon in settings
    if (termSlug === 'blocks' && post.meta?.blocks?.settings) {
      try {
        // Check if settings is already an object or needs parsing
        let settings;
        if (typeof post.meta.blocks.settings === 'string') {
          settings = JSON.parse(post.meta.blocks.settings);
        } else {
          settings = post.meta.blocks.settings;
        }
        
        if (settings && settings.icon) {
          return `dashicons-${settings.icon}`;
        }
      } catch (e) {
        // Silently handle parsing errors
      }
    }

    // Default icons based on term
    switch (termSlug) {
      case 'blocks':
        return 'dashicons-search';
      case 'symbols':
        return 'dashicons-star-filled';
      case 'scss-partials':
        return 'dashicons-art';
      default:
        return 'dashicons-admin-post';
    }
  };

  return (
    <aside id="editor-list" className='flex flex-col h-full border-r border-solid border-outline w-[400px]'>
      {/* <h2>Fanculo Posts ({totalPosts})</h2> */}

      {/* Tab Navigation */}
      <div className='p-3'>
        <div className="flex p-1 border border-solid border-outline rounded-md bg-base-alt">
          {TAXONOMY_TERMS.map(term => (
            <Button
              key={term.slug}
              variant={activeTab === term.slug ? 'primary' : 'ghost'}
              className="grow"
              onClick={() => setActiveTab(term.slug)}
            >
              {term.name}
            </Button>
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
                {groupedPosts[term.slug].map(post => {
                  // Get the actual term slug from the post's terms
                  const postTermSlug = post.terms && post.terms.length > 0 ? post.terms[0].slug : term.slug;

                  return (
                    <li
                      key={post.id}
                      onClick={() => onPostSelect(post)}
                      className={`cursor-pointer p-2 rounded flex items-center gap-2 ${
                        selectedPost?.id === post.id
                          ? 'bg-action text-highlight hover:bg-action'
                          : 'hover:bg-action/10'
                      }`}
                    >
                      <span className={`dashicons ${getPostIcon(post, postTermSlug)} text-sm`}></span>
                      <span>{post.title}</span>
                    </li>
                  );
                })}
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