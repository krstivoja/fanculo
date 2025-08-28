import { useState } from 'react'

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
  const [setting, setSetting] = useState('')
  
  // Post creation state
  const [postTitle, setPostTitle] = useState('')
  const [postType, setPostType] = useState('blocks')
  const [postContent, setPostContent] = useState('')
  const [postStyle, setPostStyle] = useState('')
  const [postAttributes, setPostAttributes] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  console.log('📱 App component rendering...', new Date().toLocaleTimeString())
  console.log('🔄 Current message state:', message)

  const handleSave = async () => {
    try {
      const response = await fetch(window.fanculo_ajax.ajax_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'fanculo_save_settings',
          nonce: window.fanculo_ajax.nonce,
          settings: JSON.stringify({ test_setting: setting }),
        }),
      })

      const result = await response.json()
      setMessage(result.success ? 'Settings saved!' : 'Error saving settings')
    } catch (error) {
      setMessage('Error saving settings')
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h1>✅ Hot Reload Working!</h1>
      <h1>✅ Hot Reload Working!</h1>
      <h1>✅ Hot Reload Working!</h1>
      <h1>✅ Hot Reload Working!</h1>
    
      
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Test Setting:
        </label>
        <input
          type="text"
          value={setting}
          onChange={(e) => setSetting(e.target.value)}
          style={{ 
            padding: '8px', 
            width: '300px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>
      
      <button 
        onClick={handleSave}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0073aa',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Save Settings
      </button>
      
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
  )
}

export default App