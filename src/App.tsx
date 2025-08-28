import { useState, useEffect } from 'react'

declare global {
  interface Window {
    fanculo_ajax: {
      ajax_url: string;
      nonce: string;
    };
  }
}

function App() {
  const [message, setMessage] = useState('')
  
  // Post creation state
  const [postTitle, setPostTitle] = useState('')
  const [postType, setPostType] = useState('blocks')
  const [postContent, setPostContent] = useState('')
  const [postStyle, setPostStyle] = useState('')
  const [postAttributes, setPostAttributes] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Posts list state
  const [posts, setPosts] = useState({
    blocks: [],
    symbols: [],
    scss: []
  })
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  
  console.log('📱 App component rendering...', new Date().toLocaleTimeString())
  console.log('🔄 Current message state:', message)

  const fetchPosts = async () => {
    setIsLoadingPosts(true)
    try {
      const response = await fetch(window.fanculo_ajax.ajax_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'fanculo_get_posts',
          nonce: window.fanculo_ajax.nonce,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setPosts(result.data)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setIsLoadingPosts(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleCreatePost = async () => {
    if (!postTitle.trim()) {
      setMessage('Please enter a post title')
      return
    }

    setIsCreating(true)
    setMessage('')

    try {
      const response = await fetch(window.fanculo_ajax.ajax_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'fanculo_create_post',
          nonce: window.fanculo_ajax.nonce,
          title: postTitle,
          type: postType,
          content: postContent,
          style: postStyle,
          attributes: postAttributes,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setMessage(`Post "${postTitle}" created successfully!`)
        // Reset form
        setPostTitle('')
        setPostContent('')
        setPostStyle('')
        setPostAttributes('')
        // Refresh posts list
        fetchPosts()
      } else {
        setMessage(result.data || 'Error creating post')
      }
    } catch (error) {
      setMessage('Error creating post')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', display: 'flex', gap: '30px' }}>
      
      {/* Main Content */}
      <div style={{ flex: '2' }}>
        <h1>🚀 Fanculo Admin</h1>
        
        {/* Post Creation Section */}
        <div style={{ 
          marginBottom: '40px', 
          padding: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
        <h2>Create New Post</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Post Title:
          </label>
          <input
            type="text"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            placeholder="Enter post title..."
            style={{ 
              padding: '8px', 
              width: '100%',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Post Type:
          </label>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['blocks', 'symbols', 'scss'].map(type => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="postType"
                  value={type}
                  checked={postType === type}
                  onChange={(e) => setPostType(e.target.value)}
                  style={{ marginRight: '5px' }}
                />
                <span style={{ textTransform: 'capitalize', fontSize: '16px' }}>
                  {type === 'blocks' && '🧱'} 
                  {type === 'symbols' && '🔣'} 
                  {type === 'scss' && '🎨'} 
                  {type}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Content Field (Blocks & Symbols) */}
        {(postType === 'blocks' || postType === 'symbols') && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              📝 Content:
            </label>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Enter HTML/JSX content..."
              rows={6}
              style={{ 
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        {/* Style Field (All types) */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            🎨 Style:
          </label>
          <textarea
            value={postStyle}
            onChange={(e) => setPostStyle(e.target.value)}
            placeholder="Enter CSS/SCSS styles..."
            rows={6}
            style={{ 
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Attributes Field (Blocks only) */}
        {postType === 'blocks' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              ⚙️ Attributes:
            </label>
            <textarea
              value={postAttributes}
              onChange={(e) => setPostAttributes(e.target.value)}
              placeholder='{"prop1": "default", "prop2": true}'
              rows={4}
              style={{ 
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        <button 
          onClick={handleCreatePost}
          disabled={isCreating}
          style={{
            padding: '12px 24px',
            backgroundColor: isCreating ? '#ccc' : '#0073aa',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {isCreating ? 'Creating...' : 'Create Post'}
        </button>
      </div>

      {message && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px',
          backgroundColor: message.includes('Error') ? '#ffebee' : '#e8f5e8',
          border: '1px solid ' + (message.includes('Error') ? '#f44336' : '#4caf50'),
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
      </div>

      {/* Sidebar */}
      <div style={{ flex: '1', minWidth: '300px' }}>
        <h2>📋 Posts Overview</h2>
        
        {isLoadingPosts ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Loading posts...
          </div>
        ) : (
          <>
            {/* Blocks Section */}
            <div style={{
              marginBottom: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff'
            }}>
              <div style={{
                padding: '10px 15px',
                backgroundColor: '#0073aa',
                color: 'white',
                borderRadius: '7px 7px 0 0',
                fontWeight: 'bold'
              }}>
                🧱 Blocks ({posts.blocks.length})
              </div>
              <div style={{ padding: '10px' }}>
                {posts.blocks.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>No blocks yet</div>
                ) : (
                  posts.blocks.map((post: any) => (
                    <div key={post.id} style={{
                      padding: '8px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '500' }}>{post.title}</span>
                      <a 
                        href={post.edit_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#0073aa', 
                          textDecoration: 'none',
                          fontSize: '12px'
                        }}
                      >
                        Edit ↗
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Symbols Section */}
            <div style={{
              marginBottom: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff'
            }}>
              <div style={{
                padding: '10px 15px',
                backgroundColor: '#2e7d32',
                color: 'white',
                borderRadius: '7px 7px 0 0',
                fontWeight: 'bold'
              }}>
                🔣 Symbols ({posts.symbols.length})
              </div>
              <div style={{ padding: '10px' }}>
                {posts.symbols.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>No symbols yet</div>
                ) : (
                  posts.symbols.map((post: any) => (
                    <div key={post.id} style={{
                      padding: '8px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '500' }}>{post.title}</span>
                      <a 
                        href={post.edit_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#2e7d32', 
                          textDecoration: 'none',
                          fontSize: '12px'
                        }}
                      >
                        Edit ↗
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SCSS Section */}
            <div style={{
              marginBottom: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fff'
            }}>
              <div style={{
                padding: '10px 15px',
                backgroundColor: '#e65100',
                color: 'white',
                borderRadius: '7px 7px 0 0',
                fontWeight: 'bold'
              }}>
                🎨 SCSS ({posts.scss.length})
              </div>
              <div style={{ padding: '10px' }}>
                {posts.scss.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>No SCSS yet</div>
                ) : (
                  posts.scss.map((post: any) => (
                    <div key={post.id} style={{
                      padding: '8px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '500' }}>{post.title}</span>
                      <a 
                        href={post.edit_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#e65100', 
                          textDecoration: 'none',
                          fontSize: '12px'
                        }}
                      >
                        Edit ↗
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App