import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TAXONOMY_TERMS } from '../../constants/taxonomy';
import { Button } from '../ui';

const EditorList = ({ groupedPosts, selectedPost, onPostSelect }) => {
  const [activeTab, setActiveTab] = useState('blocks');

  // Memoize total posts calculation
  const totalPosts = useMemo(() =>
    groupedPosts.blocks.length + groupedPosts.symbols.length + groupedPosts['scss-partials'].length,
    [groupedPosts.blocks.length, groupedPosts.symbols.length, groupedPosts['scss-partials'].length]
  );

  // Memoize the expensive icon parsing logic
  const getPostIcon = useCallback((post, termSlug) => {
    // Only show icons for blocks
    if (termSlug !== 'blocks') {
      return null;
    }

    // For blocks, check if there's a custom icon in settings
    if (post.meta?.blocks?.settings) {
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

    // Default icon for blocks
    return 'dashicons-search';
  }, []); // No dependencies as it's pure function

  // Memoize tab click handler
  const handleTabClick = useCallback((slug) => {
    setActiveTab(slug);
  }, []);

  // Memoize expensive post rendering for each term
  const renderPostList = useCallback((posts, termSlug) => {
    if (posts.length === 0) {
      const termName = TAXONOMY_TERMS.find(t => t.slug === termSlug)?.name || termSlug;
      return <p>No {termName.toLowerCase()} found</p>;
    }

    return (
      <ul className="overflow-y-auto h-full">
        {posts.map(post => {
          // Get the actual term slug from the post's terms
          const postTermSlug = post.terms && post.terms.length > 0 ? post.terms[0].slug : termSlug;
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
    );
  }, [selectedPost?.id, onPostSelect, getPostIcon]);

  return (
    <aside id="editor-list" className='flex flex-col h-full border-r border-solid border-outline w-[400px]'>
      {/* <h2>Fanculo Posts ({totalPosts})</h2> */}

      {/* Tab Navigation */}
      <div className='p-3'>
        <div className="flex p-1 border border-solid border-outline rounded-md bg-base-2">
          {TAXONOMY_TERMS.map(term => (
            <Button
              key={term.slug}
              variant={activeTab === term.slug ? 'primary' : 'ghost'}
              className="grow"
              onClick={() => handleTabClick(term.slug)}
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
            {renderPostList(groupedPosts[term.slug], term.slug)}
          </div>
        ))}
      </div>
    </aside>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(EditorList, (prevProps, nextProps) => {
  // Custom comparison function for expensive props
  return (
    // Check if groupedPosts arrays have same lengths and contents
    prevProps.groupedPosts.blocks.length === nextProps.groupedPosts.blocks.length &&
    prevProps.groupedPosts.symbols.length === nextProps.groupedPosts.symbols.length &&
    prevProps.groupedPosts['scss-partials'].length === nextProps.groupedPosts['scss-partials'].length &&
    // Check if the posts arrays reference the same objects (shallow comparison)
    prevProps.groupedPosts.blocks === nextProps.groupedPosts.blocks &&
    prevProps.groupedPosts.symbols === nextProps.groupedPosts.symbols &&
    prevProps.groupedPosts['scss-partials'] === nextProps.groupedPosts['scss-partials'] &&
    // Check if selectedPost is the same
    prevProps.selectedPost?.id === nextProps.selectedPost?.id &&
    // Check if onPostSelect function reference is the same
    prevProps.onPostSelect === nextProps.onPostSelect
  );
});