import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AppProvider } from './app/provider';
import { AppRoutes } from './app/routes';
import { GlobalErrorBoundary } from './components/ui/GlobalErrorBoundary';

/**
 * Main Application Component
 * Sets up providers and routing
 * Requirements: 23.3 - Catch unhandled errors and display friendly error page
 */
function App() {
  return (
    <GlobalErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </AppProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
