import React from 'react'
import Sidebar from './components/Sidebar.jsx'
import './styles/main.css'
import './styles/sidebar.css'

function App() {
  return (
    <div className="funculo-app">
      <Sidebar />
      <div className="main-content">
        <h2>Funculo Component Manager</h2>
        <p>Use the sidebar to browse and filter your Funculo components.</p>
        <div className="welcome-info">
          <h3>Getting Started</h3>
          <ul>
            <li>📋 <strong>View all components</strong> in the sidebar</li>
            <li>🔍 <strong>Search</strong> by name or content</li>
            <li>🏷️ <strong>Filter by type</strong>: Blocks, Symbols, or SCSS Partials</li>
            <li>✏️ <strong>Click the edit icon</strong> to modify components</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App