/**
 * 答题相关路由
 */
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/protected-route';
import { QuizPlayer } from '@/features/submissions/components/quiz-player';
import { AnswerReview } from '@/features/submissions/components/answer-review';
import { ROUTES } from '@/config/routes';

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
