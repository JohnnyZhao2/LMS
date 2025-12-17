/**
 * Quizzes API exports
 * @module features/test-center/api/quizzes
 */

// Keys
export { quizKeys } from './keys';

// Types
export type {
  QuizListParams,
  QuizQuestionInput,
  QuizCreateRequest,
  QuizUpdateRequest,
  QuizListResponse,
} from './types';

// APIs
export { fetchQuizzes, useQuizzes } from './get-quizzes';
export { fetchQuiz, useQuiz } from './get-quiz';
export { createQuiz, useCreateQuiz } from './create-quiz';
export { updateQuiz, useUpdateQuiz } from './update-quiz';
export { deleteQuiz, useDeleteQuiz } from './delete-quiz';

// Utils
export { canEditQuiz, calculateTotalScore } from './utils';
