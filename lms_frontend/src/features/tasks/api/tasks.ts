/**
 * Task API
 * API functions for task center operations
 * Requirements: 6.1, 7.1, 8.1, 9.1
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { 
  TaskAssignment, 
  KnowledgeLearningProgress,
  QuizProgress,
  Submission
} from '@/types/domain';
import type { 
  PaginatedResponse, 
  TaskFilterParams
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
// Task List API (学员任务中心)
// Requirements: 6.1 - 展示任务列表
// ============================================

/**
 * Get task assignments for current user (学员任务中心)
 */
export async function getTaskAssignments(
  params?: TaskFilterParams
): Promise<PaginatedResponse<TaskAssignmentDetail>> {
  const searchParams = new URLSearchParams();
  
  if (params?.type) searchParams.set('task_type', params.type);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.search) searchParams.set('search', params.search);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.studentTasks.list}?${queryString}`
    : API_ENDPOINTS.studentTasks.list;
    
  return api.get<PaginatedResponse<TaskAssignmentDetail>>(url);
}

/**
 * Get single task assignment detail (学员任务中心)
 */
export async function getTaskAssignmentDetail(
  assignmentId: number | string
): Promise<TaskAssignmentDetail> {
  return api.get<TaskAssignmentDetail>(
    API_ENDPOINTS.studentTasks.detail(assignmentId)
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
 * Returns the submission with quiz questions for answering
 * Requirements: 10.2, 10.5
 */
export async function startPracticeQuiz(
  taskId: number | string,
  quizId: number | string
): Promise<Submission> {
  return api.post<Submission>(
    API_ENDPOINTS.submissions.practiceStart,
    { task_id: taskId, quiz_id: quizId }
  );
}

/**
 * Submit practice quiz answers
 * Requirements: 8.6 - 展示自动判分结果和题目解析
 */
export async function submitPracticeAnswers(
  submissionId: number | string,
  answers: Record<number, string | string[]>
): Promise<Submission> {
  return api.post<Submission>(
    API_ENDPOINTS.submissions.practiceSubmit(submissionId),
    { answers }
  );
}

/**
 * Get practice result
 * Requirements: 10.4 - 查看练习结果
 */
export async function getPracticeResult(
  submissionId: number | string
): Promise<Submission> {
  return api.get<Submission>(API_ENDPOINTS.submissions.practiceResult(submissionId));
}

/**
 * Get practice history for a task
 */
export async function getPracticeHistory(
  taskId: number | string
): Promise<QuizProgress[]> {
  return api.get<QuizProgress[]>(API_ENDPOINTS.submissions.practiceHistory(taskId));
}

// ============================================
// Exam Task API
// Requirements: 9.1 - 考试任务执行
// ============================================

/**
 * Start an exam attempt
 * Requirements: 9.5 - 加载试卷并启动倒计时
 * Requirements: 12.1, 12.2, 12.7, 12.8
 */
export async function startExam(
  taskId: number | string
): Promise<Submission> {
  return api.post<Submission>(
    API_ENDPOINTS.submissions.examStart,
    { task_id: taskId }
  );
}

/**
 * Save answer during exam/practice
 */
export async function saveAnswer(
  submissionId: number | string,
  questionId: number,
  answer: string | string[]
): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(
    API_ENDPOINTS.submissions.saveAnswer(submissionId),
    { question_id: questionId, answer }
  );
}

/**
 * Submit exam answers
 * Requirements: 9.7 - 调用提交 API
 */
export async function submitExamAnswers(
  submissionId: number | string,
  answers: Record<number, string | string[]>
): Promise<Submission> {
  return api.post<Submission>(
    API_ENDPOINTS.submissions.examSubmit(submissionId),
    { answers }
  );
}

/**
 * Get exam submission result
 * Requirements: 9.8 - 展示「查看结果」
 */
export async function getExamResult(
  submissionId: number | string
): Promise<Submission> {
  return api.get<Submission>(API_ENDPOINTS.submissions.examResult(submissionId));
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
    mutationFn: ({ taskId, quizId }: { taskId: number | string; quizId: number | string }) =>
      startPracticeQuiz(taskId, quizId),
  });
}

/**
 * Hook to submit practice answers
 */
export function useSubmitPracticeAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ submissionId, answers }: { submissionId: number | string; answers: Record<number, string | string[]> }) =>
      submitPracticeAnswers(submissionId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Hook to get practice result
 */
export function useGetPracticeResult(submissionId: number | string | undefined) {
  return useQuery({
    queryKey: ['practice', 'result', submissionId],
    queryFn: () => getPracticeResult(submissionId!),
    enabled: !!submissionId,
  });
}

/**
 * Hook to start exam
 */
export function useStartExam() {
  return useMutation({
    mutationFn: (taskId: number | string) => startExam(taskId),
  });
}

/**
 * Hook to save answer
 */
export function useSaveAnswer() {
  return useMutation({
    mutationFn: ({ submissionId, questionId, answer }: { submissionId: number | string; questionId: number; answer: string | string[] }) =>
      saveAnswer(submissionId, questionId, answer),
  });
}

/**
 * Hook to submit exam answers
 */
export function useSubmitExamAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ submissionId, answers }: { submissionId: number | string; answers: Record<number, string | string[]> }) =>
      submitExamAnswers(submissionId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Hook to get exam result
 */
export function useGetExamResult(submissionId: number | string | undefined) {
  return useQuery({
    queryKey: ['exam', 'result', submissionId],
    queryFn: () => getExamResult(submissionId!),
    enabled: !!submissionId,
  });
}
