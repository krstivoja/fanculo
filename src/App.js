import React, { useState, useEffect } from 'react';
import EditorList from './components/editor/EditorList';
import './style.css';

// Hardcoded taxonomy terms - they won't change
const TAXONOMY_TERMS = [
    { slug: 'blocks', name: 'Blocks', icon: '🧱', color: '#00a32a' },
    { slug: 'symbols', name: 'Symbols', icon: '🔣', color: '#ff6900' },
    { slug: 'scss-partials', name: 'SCSS Partials', icon: '🎨', color: '#8e44ad' }
];

const App = () => {
    const [groupedPosts, setGroupedPosts] = useState({
        blocks: [],
        symbols: [],
        'scss-partials': []
    });
    const [loading, setLoading] = useState(true);

    const fetchPosts = async () => {
        try {
            // Optimized query: only get what we need
            const response = await fetch('/wp-json/wp/v2/funculos?per_page=100&_fields=id,title,funculo_type&_embed=wp:term', {
                headers: {
                    'X-WP-Nonce': window.wpApiSettings.nonce
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const posts = Array.isArray(data) ? data : [];

            // Pre-allocate arrays for better performance
            const grouped = {
                blocks: [],
                symbols: [],
                'scss-partials': []
            };

            // Faster grouping with direct property access
            for (let i = 0; i < posts.length; i++) {
                const post = posts[i];
                const terms = post._embedded?.['wp:term']?.[0];

                if (terms && terms.length > 0) {
                    const termSlug = terms[0].slug;
                    if (grouped[termSlug]) {
                        grouped[termSlug].push(post);
                    }
                }
            }

            setGroupedPosts(grouped);
        } catch (error) {
            console.error('Error fetching posts:', error);
            setGroupedPosts({
                blocks: [],
                symbols: [],
                'scss-partials': []
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Try to use pre-loaded data first
        if (window.wpApiSettings?.posts) {
            setGroupedPosts(window.wpApiSettings.posts);
            setLoading(false);
        } else {
            // Fallback to API call
            fetchPosts();
        }
    }, []);

    if (loading) return <div>Loading...</div>;

    const totalPosts = groupedPosts.blocks.length + groupedPosts.symbols.length + groupedPosts['scss-partials'].length;

    return (
        <div id="editor">
            <header id="editor-header" className='h-fit'>Header</header>

            <div className='flex w-full  border-[10px] border-solid border-[olive] grow'>
                <EditorList groupedPosts={groupedPosts} />
                
                <main id="editor-content">
                    <h1>Post title</h1>
                </main>

                <aside id="editor-settings">
                    Settings
                </aside>
            </div>


        </div>
    );
};

export default App;