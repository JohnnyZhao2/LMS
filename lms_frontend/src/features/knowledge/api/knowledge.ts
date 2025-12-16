/**
 * Knowledge API
 * API functions for knowledge center operations
 * Requirements: 5.1 - Knowledge list and detail access
 * Requirements: 17.1 - Knowledge CRUD operations for admin
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Knowledge, KnowledgeCategory, KnowledgeType, EmergencyContent } from '@/types/domain';
import type { PaginatedResponse, KnowledgeFilterParams } from '@/types/api';

// ============================================
// Types for Knowledge Management (Admin)
// ============================================

/**
 * Request type for creating knowledge
 * Requirements: 17.2, 17.3, 17.4, 17.5
 */
export interface KnowledgeCreateRequest {
  title: string;
  summary: string;
  knowledge_type: KnowledgeType;
  primary_category_id: number;
  secondary_category_id?: number;
  operation_tags?: string[];
  content?: string;                     // For OTHER type
  emergency_content?: EmergencyContent; // For EMERGENCY type
}

/**
 * Request type for updating knowledge
 * Requirements: 17.6
 */
export interface KnowledgeUpdateRequest {
  title?: string;
  summary?: string;
  knowledge_type?: KnowledgeType;
  primary_category_id?: number;
  secondary_category_id?: number | null;
  operation_tags?: string[];
  content?: string;
  emergency_content?: EmergencyContent;
}

// Query keys for React Query
export const knowledgeKeys = {
  all: ['knowledge'] as const,
  lists: () => [...knowledgeKeys.all, 'list'] as const,
  list: (params: KnowledgeFilterParams) => [...knowledgeKeys.lists(), params] as const,
  details: () => [...knowledgeKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...knowledgeKeys.details(), id] as const,
  categories: () => [...knowledgeKeys.all, 'categories'] as const,
  categoryChildren: (primaryId: number | string) => [...knowledgeKeys.categories(), 'children', primaryId] as const,
};

/**
 * Fetch knowledge list with optional filters (学员知识中心)
 */
export async function fetchKnowledgeList(
  params: KnowledgeFilterParams = {}
): Promise<PaginatedResponse<Knowledge>> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  if (params.primary_category) searchParams.set('primary_category_id', String(params.primary_category));
  if (params.secondary_category) searchParams.set('secondary_category_id', String(params.secondary_category));
  if (params.knowledge_type) searchParams.set('knowledge_type', params.knowledge_type);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.studentKnowledge.list}?${queryString}` 
    : API_ENDPOINTS.studentKnowledge.list;
  
  return api.get<PaginatedResponse<Knowledge>>(url);
}

/**
 * Fetch single knowledge detail (学员知识中心)
 */
export async function fetchKnowledgeDetail(id: number | string): Promise<Knowledge> {
  return api.get<Knowledge>(API_ENDPOINTS.studentKnowledge.detail(id));
}

/**
 * Fetch knowledge categories - primary categories (一级分类)
 */
export async function fetchKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  return api.get<KnowledgeCategory[]>(API_ENDPOINTS.studentKnowledge.categories);
}

/**
 * Fetch secondary categories for a primary category (二级分类)
 */
export async function fetchCategoryChildren(primaryId: number | string): Promise<KnowledgeCategory[]> {
  return api.get<KnowledgeCategory[]>(API_ENDPOINTS.studentKnowledge.categoryChildren(primaryId));
}

/**
 * Hook to fetch knowledge list
 * Requirements: 5.1 - Display knowledge document card list
 */
export function useKnowledgeList(params: KnowledgeFilterParams = {}) {
  return useQuery({
    queryKey: knowledgeKeys.list(params),
    queryFn: () => fetchKnowledgeList(params),
  });
}

/**
 * Hook to fetch knowledge detail
 * Requirements: 5.6, 5.7 - Display knowledge detail based on type
 */
export function useKnowledgeDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.detail(id!),
    queryFn: () => fetchKnowledgeDetail(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch knowledge categories
 * Requirements: 5.2, 5.3 - Category filter with hierarchical selection
 */
export function useKnowledgeCategories() {
  return useQuery({
    queryKey: knowledgeKeys.categories(),
    queryFn: fetchKnowledgeCategories,
    staleTime: 5 * 60 * 1000, // Categories don't change often, cache for 5 minutes
  });
}


/**
 * Hook to fetch secondary categories for a primary category
 * Requirements: 5.3 - Dynamic loading of secondary categories
 */
export function useCategoryChildren(primaryId: number | string | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.categoryChildren(primaryId!),
    queryFn: () => fetchCategoryChildren(primaryId!),
    enabled: !!primaryId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Admin Knowledge Management API Functions
// Requirements: 17.1 - Knowledge CRUD operations
// ============================================

/**
 * Fetch knowledge list for admin management (uses admin endpoint)
 * Requirements: 17.1 - Display knowledge list with search and filter
 */
export async function fetchAdminKnowledgeList(
  params: KnowledgeFilterParams = {}
): Promise<PaginatedResponse<Knowledge>> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  if (params.primary_category) searchParams.set('primary_category_id', String(params.primary_category));
  if (params.secondary_category) searchParams.set('secondary_category_id', String(params.secondary_category));
  if (params.knowledge_type) searchParams.set('knowledge_type', params.knowledge_type);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.knowledge.list}?${queryString}` 
    : API_ENDPOINTS.knowledge.list;
  
  return api.get<PaginatedResponse<Knowledge>>(url);
}

/**
 * Fetch single knowledge detail for admin
 */
export async function fetchAdminKnowledgeDetail(id: number | string): Promise<Knowledge> {
  return api.get<Knowledge>(API_ENDPOINTS.knowledge.detail(id));
}

/**
 * Create a new knowledge document
 * Requirements: 17.2, 17.3, 17.4, 17.5
 */
export async function createKnowledge(data: KnowledgeCreateRequest): Promise<Knowledge> {
  return api.post<Knowledge>(API_ENDPOINTS.knowledge.list, data);
}

/**
 * Update an existing knowledge document
 * Requirements: 17.6
 */
export async function updateKnowledge(
  id: number | string, 
  data: KnowledgeUpdateRequest
): Promise<Knowledge> {
  return api.patch<Knowledge>(API_ENDPOINTS.knowledge.detail(id), data);
}

/**
 * Delete a knowledge document
 * Requirements: 17.7
 */
export async function deleteKnowledge(id: number | string): Promise<void> {
  return api.delete(API_ENDPOINTS.knowledge.detail(id));
}

// ============================================
// Admin Knowledge Management Hooks
// ============================================

/**
 * Hook to fetch admin knowledge list
 * Requirements: 17.1 - Display knowledge list
 */
export function useAdminKnowledgeList(params: KnowledgeFilterParams = {}) {
  return useQuery({
    queryKey: [...knowledgeKeys.lists(), 'admin', params],
    queryFn: () => fetchAdminKnowledgeList(params),
  });
}

/**
 * Hook to fetch admin knowledge detail
 */
export function useAdminKnowledgeDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: [...knowledgeKeys.details(), 'admin', id],
    queryFn: () => fetchAdminKnowledgeDetail(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create knowledge
 * Requirements: 17.2, 17.3, 17.4, 17.5
 */
export function useCreateKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createKnowledge,
    onSuccess: () => {
      // Invalidate both admin and student knowledge lists
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
    },
  });
}

/**
 * Hook to update knowledge
 * Requirements: 17.6
 */
export function useUpdateKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: KnowledgeUpdateRequest }) => 
      updateKnowledge(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook to delete knowledge
 * Requirements: 17.7
 */
export function useDeleteKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteKnowledge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.lists() });
    },
  });
}
