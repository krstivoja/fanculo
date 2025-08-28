import { Suspense, lazy } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './components/Navigation'

declare global {
  interface Window {
    fanculo_ajax: {
      ajax_url: string;
      nonce: string;
      plugin_url: string;
      plugin_version: string;
      types: string[];
      type_labels: Record<string, string>;
      type_icons: Record<string, string>;
      settings: Record<string, any>;
      default_settings: Record<string, any>;
      license: Record<string, any>;
      user_can: {
        manage_options: boolean;
        edit_posts: boolean;
        delete_posts: boolean;
      };
    };
  }
}

// Lazy load pages
const EditorPage = lazy(() => import('./pages/EditorPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LicensePage = lazy(() => import('./pages/LicensePage'))

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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="p-5">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Navigate to="/editor" replace />} />
              <Route path="/editor" element={<EditorPage />} />
              {window.fanculo_ajax.user_can.manage_options && (
                <>
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/license" element={<LicensePage />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/editor" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  )
}

export default App