import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AppProvider } from './app/provider';
import { AppRoutes } from './app/routes';

/**
 * Main Application Component
 * Sets up providers and routing
 */
function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
