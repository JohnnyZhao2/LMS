/**
 * 抽查相关路由
 */
import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { ROUTES } from '@/config/routes';

const SpotCheckList = lazy(() => import('@/features/spot-checks/components/spot-check-list').then(m => ({ default: m.SpotCheckList })));
const SpotCheckForm = lazy(() => import('@/features/spot-checks/components/spot-check-form').then(m => ({ default: m.SpotCheckForm })));

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
