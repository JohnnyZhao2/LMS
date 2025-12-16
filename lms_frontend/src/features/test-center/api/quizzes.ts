/**
 * Quizzes API
 * CRUD operations for quiz/paper management
 * Requirements: 13.1, 13.2 - Quiz list and create
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Quiz } from '@/types/domain';
import type { PaginatedResponse } from '@/types/api';

// ============================================
// Request/Response Types
// ============================================

export interface QuizListParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface QuizQuestionInput {
  question_id: number;
  order: number;
  score: number;
}

export interface QuizCreateRequest {
  title: string;
  description?: string;
  questions: QuizQuestionInput[];
}

export type QuizUpdateRequest = Partial<QuizCreateRequest>;

export type QuizListResponse = PaginatedResponse<Quiz>;

// ============================================
// Query Keys
// ============================================

export const quizKeys = {
  all: ['quizzes'] as const,
  lists: () => [...quizKeys.all, 'list'] as const,
  list: (params: QuizListParams) => [...quizKeys.lists(), params] as const,
  details: () => [...quizKeys.all, 'detail'] as const,
  detail: (id: number) => [...quizKeys.details(), id] as const,
};

// ============================================
// API Functions
// ============================================


async function fetchQuizzes(params: QuizListParams): Promise<QuizListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.page_size) searchParams.set('page_size', params.page_size.toString());
  if (params.search) searchParams.set('search', params.search);
  
  const url = `${API_ENDPOINTS.quizzes.list}?${searchParams.toString()}`;
  return api.get<QuizListResponse>(url);
}

async function fetchQuiz(id: number): Promise<Quiz> {
  return api.get<Quiz>(API_ENDPOINTS.quizzes.detail(id));
}

async function createQuiz(data: QuizCreateRequest): Promise<Quiz> {
  return api.post<Quiz>(API_ENDPOINTS.quizzes.list, data);
}

async function updateQuiz(id: number, data: QuizUpdateRequest): Promise<Quiz> {
  return api.patch<Quiz>(API_ENDPOINTS.quizzes.detail(id), data);
}

async function deleteQuiz(id: number): Promise<void> {
  return api.delete<void>(API_ENDPOINTS.quizzes.detail(id));
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch quizzes list with pagination and search
 * Requirements: 13.1 - Display quiz list with search
 */
export function useQuizzes(params: QuizListParams = {}) {
  return useQuery({
    queryKey: quizKeys.list(params),
    queryFn: () => fetchQuizzes(params),
  });
}

/**
 * Hook to fetch a single quiz by ID
 */
export function useQuiz(id: number) {
  return useQuery({
    queryKey: quizKeys.detail(id),
    queryFn: () => fetchQuiz(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new quiz
 * Requirements: 13.2 - Create quiz form
 */
export function useCreateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing quiz
 */
export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuizUpdateRequest }) => 
      updateQuiz(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quizKeys.detail(id) });
    },
  });
}

/**
 * Hook to delete a quiz
 */
export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.lists() });
    },
  });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if user can edit/delete a quiz
 * Requirements: 13.5, 13.6 - Ownership-based edit control
 */
export function canEditQuiz(
  quiz: Quiz,
  currentUserId: number | undefined,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!currentUserId) return false;
  return quiz.created_by.id === currentUserId;
}

/**
 * Calculate total score from quiz questions
 */
export function calculateTotalScore(questions: QuizQuestionInput[]): number {
  return questions.reduce((sum, q) => sum + q.score, 0);
}
