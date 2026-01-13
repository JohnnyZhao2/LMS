/**
 * 试卷中心相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { QuizCenter } from '@/features/quiz-center/components/quiz-center';
import { QuizForm } from '@/features/quiz-center/quizzes/components/quiz-form';
import { ROUTES } from '@/config/routes';

export const quizCenterRoutes = [
  <Route
    key="quiz-center"
    path={ROUTES.QUIZ_CENTER}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuizCenter />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-create"
    path={`${ROUTES.QUIZ_CENTER_QUIZZES}/create`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,
  <Route
    key="quiz-edit"
    path={`${ROUTES.QUIZ_CENTER_QUIZZES}/:id/edit`}
    element={
      <ProtectedRoute allowedRoles={['MENTOR', 'DEPT_MANAGER', 'ADMIN']}>
        <QuizForm />
      </ProtectedRoute>
    }
  />,
];
