/* eslint-disable react-refresh/only-export-components */
/**
 * 主路由配置
 */
import { Route, Navigate, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { Suspense } from 'react';
import { RouteSkeleton } from '@/components/ui/route-skeleton';
import { RequireAuth } from '@/app/guards/route-guard';
import { useAuth } from '@/session/auth/auth-context';
import { LoginPage } from '@/app/routes/auth/login';
import { ForbiddenPage } from '@/app/routes/forbidden';
import { NotFoundPage } from '@/app/routes/not-found';
import { roleRoutes } from './routes/role-routes';
import { AppContent } from './app-content';
import { ROUTES } from '@/config/routes';

const DefaultRedirect = () => {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />;
};

const AppRoot: React.FC = () => {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <AppContent />
    </Suspense>
  );
};

export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppRoot />}>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        {roleRoutes}
        <Route path={ROUTES.FORBIDDEN} element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/" element={<DefaultRedirect />} />
    </Route>,
  ),
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);
