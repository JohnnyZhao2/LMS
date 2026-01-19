/**
 * 用户管理相关路由
 */
import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { ROUTES } from '@/config/routes';

const UserList = lazy(() => import('@/features/users/components/user-list').then(m => ({ default: m.UserList })));

export const userRoutes = [
  <Route
    key="user-list"
    path={ROUTES.USERS}
    element={
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <UserList />
      </ProtectedRoute>
    }
  />,
];
