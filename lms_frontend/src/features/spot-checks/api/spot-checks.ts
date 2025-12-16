/**
 * Spot Check API
 * API functions for spot check center operations
 * Requirements: 16.1 - 展示抽查记录列表（按时间倒序）
 * Requirements: 16.2, 16.3, 16.4, 16.5 - 创建抽查记录
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserBasic, SpotCheck } from '@/types/domain';
import type { PaginatedResponse, ListParams } from '@/types/api';

// ============================================
// Spot Check Types
// ============================================

/**
 * Spot check list item
 */
export interface SpotCheckListItem {
  id: number;
  student: UserBasic;
  content: string;
  score: number;
  comment?: string;
  checked_by: UserBasic;
  checked_at: string;
}

/**
 * Spot check detail data
 * Using type alias since no additional fields are needed
 */
export type SpotCheckDetail = SpotCheck;

/**
 * Create spot check request
 * Requirements: 16.3 - 要求选择被抽查学员、填写抽查内容、评分和评语
 */
export interface CreateSpotCheckRequest {
  student_id: number;
  content: string;
  score: number;
  comment?: string;
}

/**
 * Update spot check request
 */
export interface UpdateSpotCheckRequest {
  content?: string;
  score?: number;
  comment?: string;
}

/**
 * Spot check filter params
 */
export interface SpotCheckFilterParams extends ListParams {
  student_id?: number;
  checked_by_id?: number;
  start_date?: string;
  end_date?: string;
}

// ============================================
// API Functions
// ============================================

/**
 * Get spot check list (ordered by time descending)
 * Requirements: 16.1 - 展示抽查记录列表（按时间倒序）
 */
export async function getSpotCheckList(
  params?: SpotCheckFilterParams
): Promise<PaginatedResponse<SpotCheckListItem>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.student_id) searchParams.set('student_id', String(params.student_id));
  if (params?.checked_by_id) searchParams.set('checked_by_id', String(params.checked_by_id));
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  // Default ordering by time descending
  searchParams.set('ordering', '-checked_at');
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.spotChecks.list}?${queryString}`
    : API_ENDPOINTS.spotChecks.list;
    
  return api.get<PaginatedResponse<SpotCheckListItem>>(url);
}

/**
 * Get spot check detail
 */
export async function getSpotCheckDetail(
  id: number | string
): Promise<SpotCheckDetail> {
  return api.get<SpotCheckDetail>(API_ENDPOINTS.spotChecks.detail(id));
}

/**
 * Create a new spot check record
 * Requirements: 16.2 - 展示抽查记录创建表单
 * Requirements: 16.3 - 要求选择被抽查学员、填写抽查内容、评分和评语
 */
export async function createSpotCheck(
  data: CreateSpotCheckRequest
): Promise<SpotCheckDetail> {
  return api.post<SpotCheckDetail>(API_ENDPOINTS.spotChecks.list, data);
}

/**
 * Update a spot check record
 */
export async function updateSpotCheck(
  id: number | string,
  data: UpdateSpotCheckRequest
): Promise<SpotCheckDetail> {
  return api.patch<SpotCheckDetail>(API_ENDPOINTS.spotChecks.detail(id), data);
}

/**
 * Delete a spot check record
 */
export async function deleteSpotCheck(
  id: number | string
): Promise<void> {
  return api.delete<void>(API_ENDPOINTS.spotChecks.detail(id));
}

// ============================================
// React Query Hooks
// ============================================

export const spotCheckKeys = {
  all: ['spotChecks'] as const,
  lists: () => [...spotCheckKeys.all, 'list'] as const,
  list: (params?: SpotCheckFilterParams) => [...spotCheckKeys.lists(), params] as const,
  details: () => [...spotCheckKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...spotCheckKeys.details(), id] as const,
};

/**
 * Hook to fetch spot check list
 * Requirements: 16.1
 */
export function useSpotCheckList(params?: SpotCheckFilterParams) {
  return useQuery({
    queryKey: spotCheckKeys.list(params),
    queryFn: () => getSpotCheckList(params),
  });
}

/**
 * Hook to fetch spot check detail
 */
export function useSpotCheckDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: spotCheckKeys.detail(id!),
    queryFn: () => getSpotCheckDetail(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a spot check
 * Requirements: 16.2, 16.3
 */
export function useCreateSpotCheck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSpotCheck,
    onSuccess: () => {
      // Invalidate list to refresh
      queryClient.invalidateQueries({ queryKey: spotCheckKeys.lists() });
    },
  });
}

/**
 * Hook to update a spot check
 */
export function useUpdateSpotCheck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateSpotCheckRequest }) =>
      updateSpotCheck(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: spotCheckKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spotCheckKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook to delete a spot check
 */
export function useDeleteSpotCheck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteSpotCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spotCheckKeys.lists() });
    },
  });
}
