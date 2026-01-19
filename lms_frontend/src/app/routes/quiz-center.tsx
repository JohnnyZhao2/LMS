/**
 * 试卷中心相关路由
 */
import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { ROUTES } from '@/config/routes';

const QuizCenter = lazy(() => import('@/features/quiz-center/components/quiz-center').then(m => ({ default: m.QuizCenter })));
const QuizForm = lazy(() => import('@/features/quiz-center/quizzes/components/quiz-form').then(m => ({ default: m.QuizForm })));

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
