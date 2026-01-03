/**
 * 评分相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { GradingList } from '@/features/grading/components/grading-list';
import { GradingForm } from '@/features/grading/components/grading-form';
import { ROUTES } from '@/config/routes';

export const gradingRoutes = [
  <Route
    key="grading-list"
    path={ROUTES.GRADING}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <GradingList />
      </ProtectedRoute>
    }
  />,
  <Route
    key="grading-detail"
    path={`${ROUTES.GRADING}/:id`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <GradingForm />
      </ProtectedRoute>
    }
  />,
];
