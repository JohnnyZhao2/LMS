/**
 * 测试中心相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { TestCenter } from '@/features/test-center/components/test-center';
import { QuestionForm } from '@/features/questions/components/question-form';
import { QuizForm } from '@/features/quizzes/components/quiz-form';
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
    key="question-create"
    path={`${ROUTES.TEST_CENTER_QUESTIONS}/create`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuestionForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="question-edit"
    path={`${ROUTES.TEST_CENTER_QUESTIONS}/:id/edit`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuestionForm />
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
