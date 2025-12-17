/**
 * Question API Types
 * Type definitions for question management API
 * @module features/test-center/api/questions/types
 */

import type { QuestionType, QuestionOption, Question } from '@/types/domain';
import type { PaginatedResponse } from '@/types/api';

/**
 * Question list params for filtering
 */
export interface QuestionListParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: QuestionType;
}

/**
 * Request type for creating a question
 */
export interface QuestionCreateRequest {
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  answer: string | string[];
  explanation: string;
}

/**
 * Request type for updating a question
 */
export type QuestionUpdateRequest = Partial<QuestionCreateRequest>;

/**
 * Question list response type
 */
export type QuestionListResponse = PaginatedResponse<Question>;
