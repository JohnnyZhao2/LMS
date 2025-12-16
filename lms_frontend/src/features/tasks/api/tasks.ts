/**
 * Task API
 * API functions for task center operations
 * Requirements: 6.1, 7.1, 8.1, 9.1
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { 
  TaskAssignment, 
  Quiz,
  KnowledgeLearningProgress,
  QuizProgress,
  Submission
} from '@/types/domain';
import type { 
  PaginatedResponse, 
  TaskFilterParams,
  SubmitAnswersRequest 
} from '@/types/api';

// ============================================
// Task Assignment Types (Extended for API)
// ============================================

export interface TaskAssignmentDetail extends TaskAssignment {
  knowledge_progress?: KnowledgeLearningProgress[];
  quiz_progress?: QuizProgress[];
}

export interface TaskListResponse {
  assignments: TaskAssignmentDetail[];
  total: number;
}

// ============================================
// Task List API
// Requirements: 6.1 - 展示任务列表
// ============================================

/**
 * Get task assignments for current user
 */
export async function getTaskAssignments(
  params?: TaskFilterParams
): Promise<PaginatedResponse<TaskAssignmentDetail>> {
  const searchParams = new URLSearchParams();
  
  if (params?.type) searchParams.set('type', params.type);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.search) searchParams.set('search', params.search);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.tasks.assignments}?${queryString}`
    : API_ENDPOINTS.tasks.assignments;
    
  return api.get<PaginatedResponse<TaskAssignmentDetail>>(url);
}

/**
 * Get single task assignment detail
 */
export async function getTaskAssignmentDetail(
  assignmentId: number | string
): Promise<TaskAssignmentDetail> {
  return api.get<TaskAssignmentDetail>(
    API_ENDPOINTS.tasks.assignmentDetail(assignmentId)
  );
}

// ============================================
// Learning Task API
// Requirements: 7.1 - 学习任务执行
// ============================================

/**
 * Mark knowledge item as completed in a learning task
 * Requirements: 7.4 - 调用 API 记录完成状态
 */
export async function completeKnowledgeLearning(
  assignmentId: number | string,
  knowledgeId: number | string
): Promise<{ success: boolean; completed_at: string }> {
  return api.post<{ success: boolean; completed_at: string }>(
    API_ENDPOINTS.tasks.completeKnowledge(assignmentId, knowledgeId)
  );
}

// ============================================
// Practice Task API
// Requirements: 8.1 - 练习任务执行
// ============================================

/**
 * Start a practice quiz attempt
 * Returns the quiz with questions for answering
 */
export async function startPracticeQuiz(
  assignmentId: number | string,
  quizId: number | string
): Promise<{ quiz: Quiz; attempt_number: number }> {
  return api.post<{ quiz: Quiz; attempt_number: number }>(
    `${API_ENDPOINTS.tasks.assignmentDetail(assignmentId)}/start-quiz/`,
    { quiz_id: quizId }
  );
}

/**
 * Submit practice quiz answers
 * Requirements: 8.6 - 展示自动判分结果和题目解析
 */
export async function submitPracticeAnswers(
  data: SubmitAnswersRequest
): Promise<Submission> {
  return api.post<Submission>(API_ENDPOINTS.submissions.submit, {
    ...data,
    is_practice: true
  });
}

// ============================================
// Exam Task API
// Requirements: 9.1 - 考试任务执行
// ============================================

/**
 * Start an exam attempt
 * Requirements: 9.5 - 加载试卷并启动倒计时
 */
export async function startExam(
  assignmentId: number | string
): Promise<{ 
  quiz: Quiz; 
  start_time: string; 
  end_time: string;
  remaining_seconds: number;
}> {
  return api.post<{ 
    quiz: Quiz; 
    start_time: string; 
    end_time: string;
    remaining_seconds: number;
  }>(
    `${API_ENDPOINTS.tasks.assignmentDetail(assignmentId)}/start-exam/`
  );
}

/**
 * Submit exam answers
 * Requirements: 9.7 - 调用提交 API
 */
export async function submitExamAnswers(
  data: SubmitAnswersRequest
): Promise<Submission> {
  return api.post<Submission>(API_ENDPOINTS.submissions.submit, {
    ...data,
    is_exam: true
  });
}

/**
 * Get exam submission result
 * Requirements: 9.8 - 展示「查看结果」
 */
export async function getExamResult(
  submissionId: number | string
): Promise<Submission> {
  return api.get<Submission>(API_ENDPOINTS.submissions.detail(submissionId));
}

// ============================================
// React Query Hooks
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const taskKeys = {
  all: ['tasks'] as const,
  assignments: (params?: TaskFilterParams) => [...taskKeys.all, 'assignments', params] as const,
  assignment: (id: number | string) => [...taskKeys.all, 'assignment', id] as const,
};

/**
 * Hook to fetch task assignments
 */
export function useTaskAssignments(params?: TaskFilterParams) {
  return useQuery({
    queryKey: taskKeys.assignments(params),
    queryFn: () => getTaskAssignments(params),
  });
}

/**
 * Hook to fetch single task assignment detail
 */
export function useTaskAssignmentDetail(assignmentId: number | string | undefined) {
  return useQuery({
    queryKey: taskKeys.assignment(assignmentId!),
    queryFn: () => getTaskAssignmentDetail(assignmentId!),
    enabled: !!assignmentId,
  });
}

/**
 * Hook to complete knowledge learning
 */
export function useCompleteKnowledgeLearning() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ assignmentId, knowledgeId }: { assignmentId: number | string; knowledgeId: number | string }) =>
      completeKnowledgeLearning(assignmentId, knowledgeId),
    onSuccess: (_, variables) => {
      // Invalidate the specific assignment to refresh progress
      queryClient.invalidateQueries({ queryKey: taskKeys.assignment(variables.assignmentId) });
      // Also invalidate the list
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Hook to start practice quiz
 */
export function useStartPracticeQuiz() {
  return useMutation({
    mutationFn: ({ assignmentId, quizId }: { assignmentId: number | string; quizId: number | string }) =>
      startPracticeQuiz(assignmentId, quizId),
  });
}

/**
 * Hook to submit practice answers
 */
export function useSubmitPracticeAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: submitPracticeAnswers,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.assignment(variables.task_id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Hook to start exam
 */
export function useStartExam() {
  return useMutation({
    mutationFn: (assignmentId: number | string) => startExam(assignmentId),
  });
}

/**
 * Hook to submit exam answers
 */
export function useSubmitExamAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: submitExamAnswers,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.assignment(variables.task_id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
