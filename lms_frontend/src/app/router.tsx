/* eslint-disable react-refresh/only-export-components */
/**
 * 主路由配置
 */
import { Route, Navigate, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { Suspense } from 'react';
import { RouteSkeleton } from '@/components/ui/route-skeleton';
import { ProtectedRoute, RequireAuth } from '@/app/guards/route-guard';
import { useAuth } from '@/lib/auth';
import { LoginPage } from '@/app/routes/auth/login';
import { DashboardPage } from '@/app/routes/dashboard';
import { ForbiddenPage } from '@/app/routes/forbidden';
import { NotFoundPage } from '@/app/routes/not-found';
import { AppContent } from './app-content';
import { BUSINESS_ROUTE_META } from './route-registry';
import { ROUTES } from '@/config/routes';

const DefaultRedirect = () => {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />;
};

export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={(
      <Suspense fallback={<RouteSkeleton />}>
        <AppContent />
      </Suspense>
    )}>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="dashboard" element={<DashboardPage />} />
        {BUSINESS_ROUTE_META.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={(
              <ProtectedRoute
                requiredPermissions={route.requiredPermissions}
                permissionMode={route.permissionMode}
              >
                {route.element}
              </ProtectedRoute>
            )}
          />
        ))}
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
