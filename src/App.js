import React, { useState, useEffect } from 'react';

const App = () => {
    const [groupedPosts, setGroupedPosts] = useState({
        blocks: [],
        symbols: [],
        'scss-partials': []
    });
    const [loading, setLoading] = useState(true);

    const fetchPosts = async () => {
        try {
            // Fetch posts with taxonomy data
            const response = await fetch('/wp-json/wp/v2/funculos?per_page=100&_embed', {
                headers: {
                    'X-WP-Nonce': window.wpApiSettings.nonce
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const posts = Array.isArray(data) ? data : [];
            
            // Group posts by taxonomy
            const grouped = {
                blocks: [],
                symbols: [],
                'scss-partials': []
            };
            
            posts.forEach(post => {
                const taxonomy = post._embedded?.['wp:term']?.[0];
                if (taxonomy && taxonomy.length > 0) {
                    const termSlug = taxonomy[0].slug;
                    if (grouped[termSlug]) {
                        grouped[termSlug].push(post);
                    }
                }
            });
            
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
        fetchPosts();
    }, []);

    if (loading) return <div>Loading...</div>;

    const totalPosts = groupedPosts.blocks.length + groupedPosts.symbols.length + groupedPosts['scss-partials'].length;

    return (
        <div>
            <h2>Fanculo Posts ({totalPosts})</h2>
            
            {/* Blocks Group */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Blocks ({groupedPosts.blocks.length})</h3>
                {groupedPosts.blocks.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                        {groupedPosts.blocks.map(post => (
                            <li key={post.id}>{post.title.rendered}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No blocks found</p>
                )}
            </div>

            {/* Symbols Group */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Symbols ({groupedPosts.symbols.length})</h3>
                {groupedPosts.symbols.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                        {groupedPosts.symbols.map(post => (
                            <li key={post.id}>{post.title.rendered}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No symbols found</p>
                )}
            </div>

            {/* SCSS Partials Group */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">SCSS Partials ({groupedPosts['scss-partials'].length})</h3>
                {groupedPosts['scss-partials'].length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                        {groupedPosts['scss-partials'].map(post => (
                            <li key={post.id}>{post.title.rendered}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No SCSS partials found</p>
                )}
            </div>
        </div>
    );
};

export default App;