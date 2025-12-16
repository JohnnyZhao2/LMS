/**
 * Personal Center API
 * API functions for fetching personal profile, score history, and wrong answers
 * Requirements: 10.1, 10.2, 10.3
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UserBasic, Question, Quiz, Task } from '@/types/domain';

// ============================================
// Personal Center Types
// ============================================

/**
 * Personal profile information
 * Requirements: 10.1 - Display name, team, mentor info
 */
export interface PersonalProfile {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  department: {
    id: number;
    name: string;
  };
  mentor?: UserBasic;
  created_at: string;
}

/**
 * Score record for practice or exam
 * Requirements: 10.2 - Display practice and exam score records
 */
export interface ScoreRecord {
  id: number;
  task: Pick<Task, 'id' | 'title' | 'type'>;
  quiz: Pick<Quiz, 'id' | 'title' | 'total_score'>;
  attempt_number: number;
  obtained_score: number;
  total_score: number;
  submitted_at: string;
  is_passed?: boolean;
}

/**
 * Score history response
 */
export interface ScoreHistoryResponse {
  records: ScoreRecord[];
  total: number;
  average_score: number;
  pass_rate: number;
}

/**
 * Wrong answer record
 * Requirements: 10.3 - Display wrong answers from practice and exams
 */
export interface WrongAnswerRecord {
  id: number;
  question: Question;
  user_answer: string | string[];
  correct_answer: string | string[];
  task_title: string;
  quiz_title: string;
  submitted_at: string;
}

/**
 * Wrong answers response
 */
export interface WrongAnswersResponse {
  wrong_answers: WrongAnswerRecord[];
  total: number;
}

/**
 * Personal center data (combined response)
 */
export interface PersonalCenterData {
  profile: PersonalProfile;
  score_summary: {
    total_submissions: number;
    average_score: number;
    pass_rate: number;
    best_score: number;
  };
  recent_scores: ScoreRecord[];
  wrong_answer_count: number;
}

// ============================================
// Query Keys
// ============================================

export const personalKeys = {
  all: ['personal'] as const,
  profile: () => [...personalKeys.all, 'profile'] as const,
  scores: (params?: ScoreHistoryParams) => [...personalKeys.all, 'scores', params] as const,
  wrongAnswers: (params?: WrongAnswersParams) => [...personalKeys.all, 'wrongAnswers', params] as const,
};

// ============================================
// API Parameters
// ============================================

export interface ScoreHistoryParams {
  page?: number;
  page_size?: number;
  type?: 'PRACTICE' | 'EXAM';
}

export interface WrongAnswersParams {
  page?: number;
  page_size?: number;
  question_type?: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch personal profile
 * Requirements: 10.1 - Display name, team, mentor info
 */
export async function fetchPersonalProfile(): Promise<PersonalProfile> {
  return api.get<PersonalProfile>(API_ENDPOINTS.personalCenter.profile);
}

/**
 * Fetch score history
 * Requirements: 10.2 - Display practice and exam score records
 */
export async function fetchScoreHistory(
  params?: ScoreHistoryParams
): Promise<ScoreHistoryResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.type) searchParams.set('task_type', params.type);
  
  const queryString = searchParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.personalCenter.scores}?${queryString}`
    : API_ENDPOINTS.personalCenter.scores;
    
  return api.get<ScoreHistoryResponse>(url);
}

/**
 * Fetch wrong answers
 * Requirements: 10.3 - Display wrong answers from practice and exams
 */
export async function fetchWrongAnswers(
  params?: WrongAnswersParams
): Promise<WrongAnswersResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.question_type) searchParams.set('question_type', params.question_type);
  
  const queryString = searchParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.personalCenter.wrongAnswers}?${queryString}`
    : API_ENDPOINTS.personalCenter.wrongAnswers;
    
  return api.get<WrongAnswersResponse>(url);
}

/**
 * Export score history as file
 * Requirements: 10.4 - Download file containing score history
 */
export async function exportScoreHistory(
  params?: ScoreHistoryParams
): Promise<Blob> {
  const searchParams = new URLSearchParams();
  
  if (params?.type) searchParams.set('task_type', params.type);
  
  const queryString = searchParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.personalCenter.scoresExport}?${queryString}`
    : API_ENDPOINTS.personalCenter.scoresExport;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('lms_access_token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('导出失败');
  }
  
  return response.blob();
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch personal profile
 */
export function usePersonalProfile() {
  return useQuery({
    queryKey: personalKeys.profile(),
    queryFn: fetchPersonalProfile,
  });
}

/**
 * Hook to fetch score history
 */
export function useScoreHistory(params?: ScoreHistoryParams) {
  return useQuery({
    queryKey: personalKeys.scores(params),
    queryFn: () => fetchScoreHistory(params),
  });
}

/**
 * Hook to fetch wrong answers
 */
export function useWrongAnswers(params?: WrongAnswersParams) {
  return useQuery({
    queryKey: personalKeys.wrongAnswers(params),
    queryFn: () => fetchWrongAnswers(params),
  });
}
