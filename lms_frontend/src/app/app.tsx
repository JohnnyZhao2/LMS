import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './provider';
import { AppContent } from './app-content';
import { AgentationToolbar } from '@/components/dev/agentation-toolbar';

/**
 * 应用根组件
 */
export const App: React.FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppProvider>
        <AppContent />
        <AgentationToolbar />
      </AppProvider>
    </BrowserRouter>
  );
};
