import React, { Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import "./style.css";

// ========================================
// DEV MODE - Set to false for production
// ========================================
const ENABLE_DESIGN_SYSTEM = true;

// Lazy load pages for code-splitting
const EditorPage = lazy(() => import("./pages/EditorPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LicencePage = lazy(() => import("./pages/LicencePage"));
const DesignSystemPage = ENABLE_DESIGN_SYSTEM ? lazy(() => import("./pages/DesignSystemPage")) : null;

/**
 * Wrapper component to inject URL search params into EditorPage
 * Enables URL-based routing for post selection and tab state
 */
const EditorPageWrapper = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  return <EditorPage searchParams={searchParams} setSearchParams={setSearchParams} />;
};

const App = () => {
  return (
    <Router>
      <Suspense fallback={null}>
        <Routes>
          {/* Default route - Editor */}
          <Route path="/" element={<EditorPageWrapper />} />

          {/* Settings route */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* Licence route */}
          <Route path="/licence" element={<LicencePage />} />

          {/* Design System route (DEV ONLY) */}
          {ENABLE_DESIGN_SYSTEM && (
            <Route path="/design-system" element={<DesignSystemPage />} />
          )}

          {/* Catch all - redirect to editor */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
