import { Suspense, lazy } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './ui/patterns/Navigation'
import LoadingSpinner from './ui/components/LoadingSpinner'


// Lazy load pages
const EditorPage = lazy(() => import('./pages/EditorPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LicensePage = lazy(() => import('./pages/LicensePage'))



function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <>
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
        </>
      </div>
    </Router>
  )
}

export default App