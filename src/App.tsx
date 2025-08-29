import { Suspense, lazy, useRef } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './ui/patterns/Navigation'
import LoadingSpinner from './ui/components/LoadingSpinner'


// Lazy load pages
const EditorPage = lazy(() => import('./pages/EditorPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LicensePage = lazy(() => import('./pages/LicensePage'))



function App() {
  const editorPageRef = useRef<{ handleQuickCreate: (type: string) => void } | null>(null)

  const handleQuickCreateFromNav = (type: string) => {
    if (editorPageRef.current) {
      editorPageRef.current.handleQuickCreate(type)
    }
  }

  return (
    <Router>
      <div className="min-h-screen">
        <Navigation onQuickCreate={handleQuickCreateFromNav} />
        <>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Navigate to="/editor" replace />} />
              <Route path="/editor" element={<EditorPage ref={editorPageRef} />} />
              {window.fanculo_ajax.user_can.manage_options && (
                <>
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/license" element={<LicensePage />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/editor" replace />} />
            </Routes>
          </Suspense>
        </>
      </div>
    </Router>
  )
}

export default App