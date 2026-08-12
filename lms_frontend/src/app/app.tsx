import { RouterProvider } from 'react-router-dom';
import { appRouter } from './router';
import { AppProvider } from './provider';

/**
 * 应用根组件
 * Provider 放在 Router 外，避免 HMR/路由热更新时 AuthContext 实例错位
 */
export const App: React.FC = () => {
  return (
    <AppProvider>
      <RouterProvider router={appRouter} future={{ v7_startTransition: true }} />
    </AppProvider>
  );
};
