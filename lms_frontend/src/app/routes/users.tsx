/**
 * 用户管理相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { UserList } from '@/features/users/components/user-list';
import { ROUTES } from '@/config/routes';

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
