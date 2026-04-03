/* eslint-disable react-refresh/only-export-components */
/**
 * 主路由配置
 */
import { Route, Navigate, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { Suspense } from 'react';
import { Agentation } from 'agentation';
import { RouteSkeleton } from '@/components/ui/route-skeleton';
import { RoleRouteWrapper } from '@/components/role-route-wrapper';
import { roleRoutes } from './routes/role-routes';
import { authRoutes } from './routes/auth';
import { AppContent } from './app-content';
import { AppProvider } from './provider';
import { tokenStorage } from '@/lib/token-storage';

/**
 * 获取默认角色路径
 */
const getDefaultRolePath = () => {
  const role = tokenStorage.getCurrentRole();
  return role ? `/${role.toLowerCase()}/dashboard` : '/login';
};

/**
 * 默认重定向组件
 */
const DefaultRedirect = () => {
  return <Navigate to={getDefaultRolePath()} replace />;
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
      {authRoutes}

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
