import React, { useState, useEffect } from 'react';
import EditorList from './components/editor/EditorList';
import EditorHeader from './components/editor/EditorHeader';
import EditorMain from './components/editor/EditorMain';
import EditorSettings from './components/editor/EditorSettings';
import './style.css';


const App = () => {
    const [groupedPosts, setGroupedPosts] = useState({
        blocks: [],
        symbols: [],
        'scss-partials': []
    });
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);

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
            <EditorHeader />

            <div className='flex w-full flex-1 min-h-0'>
                <EditorList groupedPosts={groupedPosts} selectedPost={selectedPost} onPostSelect={setSelectedPost} />
                <EditorMain selectedPost={selectedPost} />
                <EditorSettings selectedPost={selectedPost} />
            </div>

        </div>
    );
};

export default App;