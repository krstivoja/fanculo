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
  const [activeTab, setActiveTab] = useState('blocks')
  
  // Quick create modal state
  const [showModal, setShowModal] = useState(false)
  const [quickCreateType, setQuickCreateType] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [isQuickCreating, setIsQuickCreating] = useState(false)
  
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

  const handleQuickCreate = (type: string) => {
    setQuickCreateType(type)
    setShowModal(true)
    setQuickTitle('')
  }

  const handleQuickCreateSubmit = async () => {
    if (!quickTitle.trim()) {
      setMessage('Please enter a title')
      return
    }

    setIsQuickCreating(true)
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
          title: quickTitle,
          type: quickCreateType,
          content: '',
          style: '',
          attributes: '',
        }),
      })

      const result = await response.json()
      if (result.success) {
        setMessage(`${quickCreateType} "${quickTitle}" created successfully!`)
        setShowModal(false)
        setQuickTitle('')
        fetchPosts()
        // Switch to the tab of the created post type
        setActiveTab(quickCreateType)
      } else {
        setMessage(result.data || 'Error creating post')
      }
    } catch (error) {
      setMessage('Error creating post')
    } finally {
      setIsQuickCreating(false)
    }
  }

  const handleCreatePost = async () => {
    if (!postTitle.trim()) {
      setMessage('Please enter a post title')
      return
    }

    console.log('🔄 Creating post with data:', {
      title: postTitle,
      type: postType,
      content: postContent,
      style: postStyle,
      attributes: postAttributes
    })

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
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          marginBottom: '20px' 
        }}>
          <h1 style={{ margin: 0 }}>🚀 Fanculo Admin</h1>
          <div style={{ position: 'relative' }}>
            <select
              onChange={(e) => e.target.value && handleQuickCreate(e.target.value)}
              value=""
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '2px solid #0073aa',
                backgroundColor: 'white',
                color: '#0073aa',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                outline: 'none'
              }}
            >
              <option value="">+ Quick Create</option>
              <option value="blocks">🧱 Blocks</option>
              <option value="symbols">🔣 Symbols</option>
              <option value="scss">🎨 SCSS</option>
            </select>
          </div>
        </div>
        
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

      {/* Sidebar with Tabs */}
      <div style={{ flex: '1', minWidth: '300px' }}>
        <h2>📋 Posts Overview</h2>
        
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #ddd',
          marginBottom: '20px'
        }}>
          {[
            { key: 'blocks', label: '🧱 Blocks', color: '#0073aa' },
            { key: 'symbols', label: '🔣 Symbols', color: '#2e7d32' },
            { key: 'scss', label: '🎨 SCSS', color: '#e65100' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                backgroundColor: activeTab === tab.key ? tab.color : '#f5f5f5',
                color: activeTab === tab.key ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                borderRadius: activeTab === tab.key ? '6px 6px 0 0' : '0',
                marginBottom: activeTab === tab.key ? '-2px' : '0',
                zIndex: activeTab === tab.key ? 10 : 1,
                position: 'relative'
              }}
            >
              {tab.label} ({posts[tab.key as keyof typeof posts].length})
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '0 0 8px 8px',
          backgroundColor: '#fff',
          minHeight: '300px'
        }}>
          {isLoadingPosts ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Loading posts...
            </div>
          ) : (
            <div style={{ padding: '15px' }}>
              {posts[activeTab as keyof typeof posts].length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666', 
                  fontStyle: 'italic',
                  padding: '40px 20px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                    {activeTab === 'blocks' && '🧱'}
                    {activeTab === 'symbols' && '🔣'}
                    {activeTab === 'scss' && '🎨'}
                  </div>
                  No {activeTab} yet
                  <div style={{ fontSize: '12px', marginTop: '10px' }}>
                    Create your first {activeTab.slice(0, -1)} using the form on the left
                  </div>
                </div>
              ) : (
                posts[activeTab as keyof typeof posts].map((post: any) => (
                  <div key={post.id} style={{
                    padding: '12px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                        {post.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(post.date).toLocaleDateString()}
                      </div>
                    </div>
                    <a 
                      href={post.edit_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: activeTab === 'blocks' ? '#0073aa' : 
                               activeTab === 'symbols' ? '#2e7d32' : '#e65100',
                        textDecoration: 'none',
                        fontSize: '12px',
                        padding: '6px 12px',
                        border: `1px solid ${activeTab === 'blocks' ? '#0073aa' : 
                                              activeTab === 'symbols' ? '#2e7d32' : '#e65100'}`,
                        borderRadius: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = activeTab === 'blocks' ? '#0073aa' : 
                                                                 activeTab === 'symbols' ? '#2e7d32' : '#e65100'
                        e.currentTarget.style.color = 'white'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = activeTab === 'blocks' ? '#0073aa' : 
                                                       activeTab === 'symbols' ? '#2e7d32' : '#e65100'
                      }}
                    >
                      Edit ↗
                    </a>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Create Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                margin: '0 0 10px 0', 
                fontSize: '20px',
                color: '#333'
              }}>
                {quickCreateType === 'blocks' && '🧱 Create New Block'}
                {quickCreateType === 'symbols' && '🔣 Create New Symbol'}
                {quickCreateType === 'scss' && '🎨 Create New SCSS'}
              </h3>
              <p style={{ 
                margin: 0, 
                color: '#666', 
                fontSize: '14px' 
              }}>
                Enter a title for your new {quickCreateType.slice(0, -1)}. You can add content and styles later.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333'
              }}>
                Title:
              </label>
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder={`Enter ${quickCreateType.slice(0, -1)} title...`}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleQuickCreateSubmit()
                  }
                  if (e.key === 'Escape') {
                    setShowModal(false)
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={isQuickCreating}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#666',
                  cursor: isQuickCreating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleQuickCreateSubmit}
                disabled={isQuickCreating || !quickTitle.trim()}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: isQuickCreating || !quickTitle.trim() ? '#ccc' : 
                                    quickCreateType === 'blocks' ? '#0073aa' :
                                    quickCreateType === 'symbols' ? '#2e7d32' : '#e65100',
                  color: 'white',
                  cursor: (isQuickCreating || !quickTitle.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {isQuickCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App