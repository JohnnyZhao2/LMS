/**
 * 答题相关路由
 */
import { Route } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { ROUTES } from '@/config/routes';

const QuizPlayer = lazy(() => import('@/features/submissions/components/quiz-player').then(m => ({ default: m.QuizPlayer })));
const AnswerReview = lazy(() => import('@/features/submissions/components/answer-review').then(m => ({ default: m.AnswerReview })));

export const submissionRoutes = [
  <Route
    key="quiz"
    path={`${ROUTES.QUIZ}/:id`}
    element={
      <ProtectedRoute>
        <QuizPlayer />
      </ProtectedRoute>
    }
  />,
  <Route
    key="review-practice"
    path={ROUTES.REVIEW_PRACTICE}
    element={
      <ProtectedRoute>
        <AnswerReview type="practice" />
      </ProtectedRoute>
    }
  />,
  <Route
    key="review-exam"
    path={ROUTES.REVIEW_EXAM}
    element={
      <ProtectedRoute>
        <AnswerReview type="exam" />
      </ProtectedRoute>
    }
  />,
];
