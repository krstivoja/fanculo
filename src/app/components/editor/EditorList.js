import React, { useState } from 'react';
import { TAXONOMY_TERMS } from '../../constants/taxonomy';
import { Button } from '../ui';

const getPostIcon = (post, termSlug) => {
  // Only show icons for blocks
  if (termSlug !== 'blocks') {
    return null;
  }

  // For blocks, check if there's a custom icon in settings
  if (post.meta?.blocks?.settings) {
    try {
      const settings = typeof post.meta.blocks.settings === 'string'
        ? JSON.parse(post.meta.blocks.settings)
        : post.meta.blocks.settings;

      if (settings?.icon) {
        return `dashicons-${settings.icon}`;
      }
    } catch (e) {
      // Silently handle parsing errors
    }
  }

  // Default icon for blocks
  return 'dashicons-search';
};

const EditorList = ({ groupedPosts, selectedPost, onPostSelect }) => {
  const [activeTab, setActiveTab] = useState('blocks');

  return (
    <aside id="editor-list" className='flex flex-col h-full border-r border-solid border-outline w-[400px]'>
      {/* Tab Navigation */}
      <div className='p-3'>
        <div className="flex p-1 border border-solid border-outline rounded-md bg-base-2">
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
        {TAXONOMY_TERMS.map(term => {
          const posts = groupedPosts[term.slug];
          const isActive = activeTab === term.slug;

          return (
            <div key={term.slug} className={`h-full ${isActive ? 'block' : 'hidden'}`}>
              {posts.length === 0 ? (
                <p>No {term.name.toLowerCase()} found</p>
              ) : (
                <ul className="overflow-y-auto h-full">
                  {posts.map(post => {
                    const postTermSlug = post.terms?.[0]?.slug || term.slug;
                    const iconClass = getPostIcon(post, postTermSlug);

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
                        {iconClass && <span className={`dashicons ${iconClass} text-sm`}></span>}
                        <span>{post.title}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default EditorList;