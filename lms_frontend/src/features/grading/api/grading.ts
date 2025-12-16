/**
 * Grading API
 * API functions for grading center operations
 * Requirements: 15.1 - 展示待评分考试列表
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  Submission, 
  Answer, 
  UserBasic, 
  Task, 
  Quiz 
} from '@/types/domain';
import type { PaginatedResponse, ListParams } from '@/types/api';

// ============================================
// Grading Types
// ============================================

/**
 * Pending grading submission item
 */
export interface PendingGradingItem {
  id: number;
  task: Pick<Task, 'id' | 'title' | 'type'>;
  quiz: Pick<Quiz, 'id' | 'title' | 'total_score'>;
  user: UserBasic;
  submitted_at: string;
  total_score: number;
  auto_score: number;
  pending_questions_count: number;
}

/**
 * Grading detail data - full submission with answers for grading
 */
export interface GradingDetailData extends Submission {
  auto_graded_score: number;
  manual_grading_required: Answer[];
}

/**
 * Grade answer request
 */
export interface GradeAnswerRequest {
  answer_id: number;
  score: number;
  comment?: string;
}

/**
 * Submit grading request
 */
export interface SubmitGradingRequest {
  grades: GradeAnswerRequest[];
}

/**
 * Submit grading response
 */
export interface SubmitGradingResponse {
  success: boolean;
  submission_id: number;
  final_score: number;
  message?: string;
}

/**
 * Grading filter params
 */
export interface GradingFilterParams extends ListParams {
  task_id?: number;
  student_id?: number;
}

// ============================================
// API Functions
// ============================================

/**
 * Get pending grading submissions list
 * Requirements: 15.1 - 展示待评分考试列表
 */
export async function getPendingGradingList(
  params?: GradingFilterParams
): Promise<PaginatedResponse<PendingGradingItem>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.task_id) searchParams.set('task_id', String(params.task_id));
  if (params?.student_id) searchParams.set('student_id', String(params.student_id));
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.grading.pendingList}?${queryString}`
    : API_ENDPOINTS.grading.pendingList;
    
  return api.get<PaginatedResponse<PendingGradingItem>>(url);
}

/**
 * Get grading detail for a submission
 * Requirements: 15.2 - 展示学员答案和评分输入界面
 */
export async function getGradingDetail(
  submissionId: number | string
): Promise<GradingDetailData> {
  return api.get<GradingDetailData>(API_ENDPOINTS.grading.detail(submissionId));
}

/**
 * Submit grading for a submission
 * Requirements: 15.4 - 调用评分 API 并更新列表状态
 */
export async function submitGrading(
  submissionId: number | string,
  data: SubmitGradingRequest
): Promise<SubmitGradingResponse> {
  return api.post<SubmitGradingResponse>(
    API_ENDPOINTS.grading.submit(submissionId),
    data
  );
}

// ============================================
// React Query Hooks
// ============================================

export const gradingKeys = {
  all: ['grading'] as const,
  pending: (params?: GradingFilterParams) => [...gradingKeys.all, 'pending', params] as const,
  detail: (id: number | string) => [...gradingKeys.all, 'detail', id] as const,
};

/**
 * Hook to fetch pending grading list
 * Requirements: 15.1
 */
export function usePendingGradingList(params?: GradingFilterParams) {
  return useQuery({
    queryKey: gradingKeys.pending(params),
    queryFn: () => getPendingGradingList(params),
  });
}

/**
 * Hook to fetch grading detail
 * Requirements: 15.2
 */
export function useGradingDetail(submissionId: number | string | undefined) {
  return useQuery({
    queryKey: gradingKeys.detail(submissionId!),
    queryFn: () => getGradingDetail(submissionId!),
    enabled: !!submissionId,
  });
}

/**
 * Hook to submit grading
 * Requirements: 15.4
 */
export function useSubmitGrading() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ submissionId, data }: { submissionId: number | string; data: SubmitGradingRequest }) =>
      submitGrading(submissionId, data),
    onSuccess: (_, variables) => {
      // Invalidate pending list to refresh
      queryClient.invalidateQueries({ queryKey: gradingKeys.all });
      // Invalidate the specific detail
      queryClient.invalidateQueries({ queryKey: gradingKeys.detail(variables.submissionId) });
    },
  });
}
