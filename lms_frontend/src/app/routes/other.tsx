/**
 * 其他路由（个人中心、数据看板等）
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { ROUTES } from '@/config/routes';

// 占位组件
const Personal = () => <div>个人中心（开发中）</div>;
const Analytics = () => <div>团队数据看板（开发中）</div>;

export const otherRoutes = [
  <Route
    key="personal"
    path={ROUTES.PERSONAL}
    element={
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <Personal />
      </ProtectedRoute>
    }
  />,
  <Route
    key="analytics"
    path={ROUTES.ANALYTICS}
    element={
      <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
        <Analytics />
      </ProtectedRoute>
    }
  />,
];
