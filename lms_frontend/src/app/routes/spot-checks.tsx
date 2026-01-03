/**
 * 抽查相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { SpotCheckList } from '@/features/spot-checks/components/spot-check-list';
import { SpotCheckForm } from '@/features/spot-checks/components/spot-check-form';
import { ROUTES } from '@/config/routes';

export const spotCheckRoutes = [
  <Route
    key="spot-check-list"
    path={ROUTES.SPOT_CHECKS}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER']}>
        <SpotCheckList />
      </ProtectedRoute>
    }
  />,
  <Route
    key="spot-check-create"
    path={`${ROUTES.SPOT_CHECKS}/create`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER']}>
        <SpotCheckForm />
      </ProtectedRoute>
    }
  />,
];
