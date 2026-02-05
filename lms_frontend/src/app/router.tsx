/**
 * 主路由配置
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { RouteSkeleton } from '@/components/ui/route-skeleton';
import { RoleRouteWrapper } from '@/components/role-route-wrapper';
import { roleRoutes } from './routes/role-routes';
import { authRoutes } from './routes/auth';
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
 * 路由配置
 */
export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        {/* 认证路由（不需要角色前缀） */}
        {authRoutes}

        {/* 角色前缀路由 */}
        <Route path="/:role" element={<RoleRouteWrapper />}>
          {roleRoutes}
        </Route>

        {/* 默认重定向 */}
        <Route path="/" element={<DefaultRedirect />} />
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </Suspense>
  );
};
