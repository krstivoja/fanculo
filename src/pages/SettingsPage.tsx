function SettingsPage() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h1 style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        ⚙️ Settings
      </h1>

      <div style={{ 
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '40px',
        textAlign: 'center',
        color: '#666'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚙️</div>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Settings Page</h3>
        <p style={{ margin: 0 }}>Plugin settings will be implemented here.</p>
      </div>
    </div>
  )
}

export default SettingsPage