/**
 * User Management API
 * API functions for user CRUD, activation/deactivation, and password reset
 * Requirements: 18.1 - User list, create, edit, deactivate, activate, reset password
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { RoleCode } from '@/config/roles';

// ============================================
// Types
// ============================================

export interface UserListItem {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
  department: {
    id: number;
    name: string;
  } | null;
  roles: Array<{
    code: RoleCode;
    name: string;
  }>;
  mentor?: {
    id: number;
    real_name: string;
  } | null;
}

export interface UserDetail extends UserListItem {
  created_at: string;
  updated_at: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  real_name: string;
  employee_id: string;
  department_id?: number;
}

export interface UserUpdateRequest {
  real_name?: string;
  employee_id?: string;
  department_id?: number | null;
}

export interface AssignRolesRequest {
  role_codes: RoleCode[];
}

export interface AssignMentorRequest {
  mentor_id: number | null;
}

export interface ResetPasswordRequest {
  user_id: number;
}

export interface ResetPasswordResponse {
  temporary_password: string;
}

export interface UserListParams {
  search?: string;
  department_id?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface PaginatedUserList {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserListItem[];
}

// ============================================
// Query Keys
// ============================================

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...userKeys.details(), id] as const,
  mentees: () => [...userKeys.all, 'mentees'] as const,
  departmentMembers: () => [...userKeys.all, 'departmentMembers'] as const,
};

// ============================================
// API Functions
// ============================================

/**
 * Fetch user list with optional filters
 * Requirements: 18.1 - Display user list
 * Note: Backend returns array directly, we wrap it in pagination format for consistency
 */
export async function fetchUserList(params: UserListParams = {}): Promise<PaginatedUserList> {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.set('search', params.search);
  if (params.department_id) searchParams.set('department_id', String(params.department_id));
  if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.users.list}?${queryString}` 
    : API_ENDPOINTS.users.list;
  
  // Backend returns array directly, check and wrap in pagination format
  const response = await api.get<UserListItem[] | PaginatedUserList>(url);
  
  // If response is an array, wrap it in pagination format
  if (Array.isArray(response)) {
    // Client-side pagination
    const page = params.page || 1;
    const pageSize = params.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = response.slice(startIndex, endIndex);
    
    return {
      count: response.length,
      next: endIndex < response.length ? `page=${page + 1}` : null,
      previous: page > 1 ? `page=${page - 1}` : null,
      results: paginatedResults,
    };
  }
  
  // If already paginated format, return as is
  return response;
}

/**
 * Fetch single user detail
 */
export async function fetchUserDetail(id: number | string): Promise<UserDetail> {
  return api.get<UserDetail>(API_ENDPOINTS.users.detail(id));
}

/**
 * Create a new user
 * Requirements: 18.2 - Create user form
 */
export async function createUser(data: UserCreateRequest): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.create, data);
}

/**
 * Update user information
 * Requirements: 18.3 - Edit user form
 */
export async function updateUser(id: number | string, data: UserUpdateRequest): Promise<UserDetail> {
  return api.patch<UserDetail>(API_ENDPOINTS.users.update(id), data);
}

/**
 * Deactivate a user
 * Requirements: 18.4 - Deactivate user
 */
export async function deactivateUser(id: number | string): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.deactivate(id), {});
}

/**
 * Activate a user
 * Requirements: 18.5 - Activate user
 */
export async function activateUser(id: number | string): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.activate(id), {});
}

/**
 * Assign roles to a user
 * Requirements: 18.7 - Role configuration (student role cannot be removed)
 */
export async function assignRoles(id: number | string, data: AssignRolesRequest): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.assignRoles(id), data);
}

/**
 * Assign mentor to a user
 */
export async function assignMentor(id: number | string, data: AssignMentorRequest): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.assignMentor(id), data);
}

/**
 * Reset user password (admin only)
 * Requirements: 18.6 - Reset password and show temporary password
 */
export async function resetPassword(userId: number): Promise<ResetPasswordResponse> {
  return api.post<ResetPasswordResponse>(API_ENDPOINTS.users.resetPassword, { user_id: userId });
}

/**
 * Fetch mentees for current mentor
 */
export async function fetchMentees(): Promise<UserListItem[]> {
  return api.get<UserListItem[]>(API_ENDPOINTS.users.mentees);
}

/**
 * Fetch department members for current department manager
 */
export async function fetchDepartmentMembers(): Promise<UserListItem[]> {
  return api.get<UserListItem[]>(API_ENDPOINTS.users.departmentMembers);
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch user list
 * Requirements: 18.1 - Display user list
 */
export function useUserList(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => fetchUserList(params),
  });
}

/**
 * Hook to fetch user detail
 */
export function useUserDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id!),
    queryFn: () => fetchUserDetail(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

/**
 * Hook to update user information
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UserUpdateRequest }) => 
      updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook to deactivate a user
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

/**
 * Hook to activate a user
 */
export function useActivateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: activateUser,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

/**
 * Hook to assign roles to a user
 */
export function useAssignRoles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AssignRolesRequest }) => 
      assignRoles(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook to assign mentor to a user
 */
export function useAssignMentor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AssignMentorRequest }) => 
      assignMentor(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook to reset user password
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: resetPassword,
  });
}

/**
 * Hook to fetch mentees
 */
export function useMentees() {
  return useQuery({
    queryKey: userKeys.mentees(),
    queryFn: fetchMentees,
  });
}

/**
 * Hook to fetch department members
 */
export function useDepartmentMembers() {
  return useQuery({
    queryKey: userKeys.departmentMembers(),
    queryFn: fetchDepartmentMembers,
  });
}
