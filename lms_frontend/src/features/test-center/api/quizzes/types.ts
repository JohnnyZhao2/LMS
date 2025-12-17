/**
 * Quiz API Types
 * Type definitions for quiz management API
 * @module features/test-center/api/quizzes/types
 */

import type { Quiz } from '@/types/domain';
import type { PaginatedResponse } from '@/types/api';

/**
 * Quiz list params for filtering
 */
export interface QuizListParams {
  page?: number;
  page_size?: number;
  search?: string;
}

/**
 * Quiz question input for creating/updating quiz
 */
export interface QuizQuestionInput {
  question_id: number;
  order: number;
  score: number;
}

/**
 * Request type for creating a quiz
 */
export interface QuizCreateRequest {
  title: string;
  description?: string;
  questions: QuizQuestionInput[];
}

/**
 * Request type for updating a quiz
 */
export type QuizUpdateRequest = Partial<QuizCreateRequest>;

/**
 * Quiz list response type
 */
export type QuizListResponse = PaginatedResponse<Quiz>;
