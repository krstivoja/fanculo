import { Suspense, lazy, useRef, useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './ui/patterns/Navigation'
import LoadingSpinner from './ui/components/LoadingSpinner'


// Lazy load pages
const EditorPage = lazy(() => import('./pages/EditorPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LicensePage = lazy(() => import('./pages/LicensePage'))



function App() {
  const editorPageRef = useRef<{ 
    handleQuickCreate: (type: string) => void;
    handleUpdatePost: () => void;
    isUpdating: boolean;
    isEditing: boolean;
  } | null>(null)

  const [navState, setNavState] = useState({
    isUpdating: false,
    isEditing: false
  })

  // Poll for state changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (editorPageRef.current) {
        const newState = {
          isUpdating: editorPageRef.current.isUpdating,
          isEditing: editorPageRef.current.isEditing
        }
        if (newState.isUpdating !== navState.isUpdating || newState.isEditing !== navState.isEditing) {
          setNavState(newState)
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [navState])

  const handleQuickCreateFromNav = (type: string) => {
    if (editorPageRef.current) {
      editorPageRef.current.handleQuickCreate(type)
    }
  }

  const handleUpdatePostFromNav = () => {
    if (editorPageRef.current) {
      editorPageRef.current.handleUpdatePost()
    }
  }

  return (
    <Router>
      <div className="min-h-screen">
        <Navigation 
          onQuickCreate={handleQuickCreateFromNav}
          onUpdatePost={handleUpdatePostFromNav}
          isUpdating={navState.isUpdating}
          showUpdateButton={navState.isEditing}
        />
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