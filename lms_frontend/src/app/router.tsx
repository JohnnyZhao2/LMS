/* eslint-disable react-refresh/only-export-components */
/**
 * 主路由配置
 */
import { Route, Navigate, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { Suspense } from 'react';
import { Agentation } from 'agentation';
import { RouteSkeleton } from '@/components/ui/route-skeleton';
import { RoleRouteWrapper } from '@/app/guards/route-guard';
import { useAuth } from '@/session/auth/auth-context';
import { LoginPage } from '@/app/routes/auth/login';
import { roleRoutes } from './routes/role-routes';
import { AppContent } from './app-content';
import { AppProvider } from './provider';
import { ROUTES } from '@/config/routes';
import { getAccessibleWorkspaceHome } from './workspace-config';

/**
 * 默认重定向组件
 */
const DefaultRedirect = () => {
  const { isAuthenticated, availableRoles, currentRole } = useAuth();

  const fallbackPath = isAuthenticated
    ? getAccessibleWorkspaceHome(
        availableRoles.map((role) => role.code),
        currentRole,
      ) ?? ROUTES.LOGIN
    : ROUTES.LOGIN;

  return <Navigate to={fallbackPath} replace />;
};

/**
 * Data Router 根壳层
 */
const AppRoot: React.FC = () => {
  return (
    <AppProvider>
      <Suspense fallback={<RouteSkeleton />}>
        <AppContent />
      </Suspense>
      {import.meta.env.DEV ? <Agentation /> : null}
    </AppProvider>
  );
};

/**
 * 路由配置
 */
export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppRoot />}>
      {/* 认证路由（不需要角色前缀） */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />

      {/* 角色前缀路由 */}
      <Route path="/:role" element={<RoleRouteWrapper />}>
        {roleRoutes}
      </Route>

      {/* 默认重定向 */}
      <Route path="/" element={<DefaultRedirect />} />
      <Route path="*" element={<DefaultRedirect />} />
    </Route>,
  ),
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);
