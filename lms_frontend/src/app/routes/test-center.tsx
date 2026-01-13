/**
 * 测试中心相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { TestCenter } from '@/features/test-center/components/test-center';
import { QuizForm } from '@/features/test-center/quizzes/components/quiz-form';
import { ROUTES } from '@/config/routes';

export const testCenterRoutes = [
  <Route
    key="test-center"
    path={ROUTES.TEST_CENTER}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <TestCenter />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-create"
    path={`${ROUTES.TEST_CENTER_QUIZZES}/create`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-edit"
    path={`${ROUTES.TEST_CENTER_QUIZZES}/:id/edit`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,
];
