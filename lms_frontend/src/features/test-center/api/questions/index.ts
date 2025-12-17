/**
 * Questions API exports
 * @module features/test-center/api/questions
 */

// Keys
export { questionKeys } from './keys';

// Types
export type {
  QuestionListParams,
  QuestionCreateRequest,
  QuestionUpdateRequest,
  QuestionListResponse,
} from './types';

// APIs
export { fetchQuestions, useQuestions } from './get-questions';
export { fetchQuestion, useQuestion } from './get-question';
export { createQuestion, useCreateQuestion } from './create-question';
export { updateQuestion, useUpdateQuestion } from './update-question';
export { deleteQuestion, useDeleteQuestion } from './delete-question';

// Utils
export { canEditQuestion, getQuestionTypeLabel, getQuestionTypeBadgeVariant } from './utils';
