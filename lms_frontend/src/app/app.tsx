import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './provider';
import { AppContent } from './app-content';

/**
 * 应用根组件
 */
export const App: React.FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
      }}
    >
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
};
