import React, { Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./style.css";

// Lazy load pages for code-splitting
const EditorPage = lazy(() => import("./pages/EditorPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LicencePage = lazy(() => import("./pages/LicencePage"));

const App = () => {
  return (
    <Router>
      <Suspense fallback={null}>
        <Routes>
          {/* Default route - Editor */}
          <Route path="/" element={<EditorPage />} />

          {/* Settings route */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* Licence route */}
          <Route path="/licence" element={<LicencePage />} />

          {/* Catch all - redirect to editor */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
