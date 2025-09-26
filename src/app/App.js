import React from 'react';
import { EditorProvider } from './contexts/EditorContext';
import AppContent from './AppContent';
import './style.css';

/**
 * Root App Component
 * Provides the EditorContext to all child components
 */
const App = () => {
    return (
        <EditorProvider>
            <AppContent />
        </EditorProvider>
    );
};

export default App;