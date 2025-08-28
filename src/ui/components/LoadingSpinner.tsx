function LoadingSpinner() {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: '#666'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '16px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #ddd',
            borderTop: '2px solid #0073aa',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

export default LoadingSpinner