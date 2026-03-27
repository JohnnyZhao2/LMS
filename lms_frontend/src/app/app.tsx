import { RouterProvider } from 'react-router-dom';
import { appRouter } from './router';

/**
 * 应用根组件
 */
export const App: React.FC = () => {
  return <RouterProvider router={appRouter} future={{ v7_startTransition: true }} />;
};
