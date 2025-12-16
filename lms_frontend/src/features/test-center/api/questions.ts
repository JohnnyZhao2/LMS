/**
 * Questions API
 * CRUD operations for question management
 * Requirements: 12.1, 12.2 - Question list and create
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Question, QuestionType, QuestionOption } from '@/types/domain';
import type { PaginatedResponse } from '@/types/api';

// ============================================
// Request/Response Types
// ============================================

export interface QuestionListParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: QuestionType;
}

export interface QuestionCreateRequest {
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  answer: string | string[];
  explanation: string;
}

export type QuestionUpdateRequest = Partial<QuestionCreateRequest>;

export type QuestionListResponse = PaginatedResponse<Question>;

// ============================================
// Query Keys
// ============================================

export const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (params: QuestionListParams) => [...questionKeys.lists(), params] as const,
  details: () => [...questionKeys.all, 'detail'] as const,
  detail: (id: number) => [...questionKeys.details(), id] as const,
};

// ============================================
// API Functions
// ============================================

async function fetchQuestions(params: QuestionListParams): Promise<QuestionListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.page_size) searchParams.set('page_size', params.page_size.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.type) searchParams.set('type', params.type);
  
  const url = `${API_ENDPOINTS.questions.list}?${searchParams.toString()}`;
  return api.get<QuestionListResponse>(url);
}

async function fetchQuestion(id: number): Promise<Question> {
  return api.get<Question>(API_ENDPOINTS.questions.detail(id));
}

async function createQuestion(data: QuestionCreateRequest): Promise<Question> {
  return api.post<Question>(API_ENDPOINTS.questions.list, data);
}

async function updateQuestion(id: number, data: QuestionUpdateRequest): Promise<Question> {
  return api.patch<Question>(API_ENDPOINTS.questions.detail(id), data);
}

async function deleteQuestion(id: number): Promise<void> {
  return api.delete<void>(API_ENDPOINTS.questions.detail(id));
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch questions list with pagination and filtering
 * Requirements: 12.1 - Display question list with search and filter
 */
export function useQuestions(params: QuestionListParams = {}) {
  return useQuery({
    queryKey: questionKeys.list(params),
    queryFn: () => fetchQuestions(params),
  });
}

/**
 * Hook to fetch a single question by ID
 */
export function useQuestion(id: number) {
  return useQuery({
    queryKey: questionKeys.detail(id),
    queryFn: () => fetchQuestion(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new question
 * Requirements: 12.2 - Create question form
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing question
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuestionUpdateRequest }) => 
      updateQuestion(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(id) });
    },
  });
}

/**
 * Hook to delete a question
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    },
  });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if user can edit/delete a question
 * Requirements: 12.5, 12.6 - Ownership-based edit control
 */
export function canEditQuestion(
  question: Question,
  currentUserId: number | undefined,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!currentUserId) return false;
  return question.created_by.id === currentUserId;
}

/**
 * Get question type display label
 */
export function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    SINGLE_CHOICE: '单选题',
    MULTIPLE_CHOICE: '多选题',
    TRUE_FALSE: '判断题',
    SHORT_ANSWER: '简答题',
  };
  return labels[type];
}

/**
 * Get question type badge variant
 */
export function getQuestionTypeBadgeVariant(type: QuestionType): 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' {
  const variants: Record<QuestionType, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
    SINGLE_CHOICE: 'default',
    MULTIPLE_CHOICE: 'secondary',
    TRUE_FALSE: 'outline',
    SHORT_ANSWER: 'warning',
  };
  return variants[type];
}
