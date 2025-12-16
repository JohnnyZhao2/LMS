/**
 * Organization Management API
 * API functions for department/room management and organization structure
 * Requirements: 19.1 - Display room list and members, adjust user department, designate room manager
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { RoleCode } from '@/config/roles';

// ============================================
// Types
// ============================================

export interface DepartmentBasic {
  id: number;
  name: string;
}

export interface DepartmentManager {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
}

export interface Department extends DepartmentBasic {
  manager: DepartmentManager | null;
  member_count: number;
}

export interface DepartmentMember {
  id: number;
  username: string;
  real_name: string;
  employee_id: string;
  is_active: boolean;
  roles: Array<{
    code: RoleCode;
    name: string;
  }>;
  mentor?: {
    id: number;
    real_name: string;
  } | null;
}

export interface DepartmentWithMembers extends Department {
  members: DepartmentMember[];
}

export interface UpdateUserDepartmentRequest {
  department_id: number | null;
}

export interface SetDepartmentManagerRequest {
  user_id: number;
}

// ============================================
// Query Keys
// ============================================

export const organizationKeys = {
  all: ['organization'] as const,
  departments: () => [...organizationKeys.all, 'departments'] as const,
  departmentList: () => [...organizationKeys.departments(), 'list'] as const,
  departmentDetail: (id: number) => [...organizationKeys.departments(), 'detail', id] as const,
  departmentMembers: (id: number) => [...organizationKeys.departments(), 'members', id] as const,
};

// ============================================
// API Functions
// ============================================

/**
 * Fetch all departments/rooms list
 * Requirements: 19.1 - Display room list
 */
export async function fetchDepartments(): Promise<Department[]> {
  return api.get<Department[]>(API_ENDPOINTS.departments.list);
}

/**
 * Fetch department detail
 */
export async function fetchDepartmentDetail(id: number): Promise<Department> {
  return api.get<Department>(API_ENDPOINTS.departments.detail(id));
}

/**
 * Fetch members of a specific department by ID
 * Requirements: 19.1 - Display members of each room
 */
export async function fetchDepartmentMembersById(id: number): Promise<DepartmentMember[]> {
  return api.get<DepartmentMember[]>(API_ENDPOINTS.departments.members(id));
}

/**
 * Update user's department assignment
 * Requirements: 19.2 - Adjust user's department
 */
export async function updateUserDepartment(
  userId: number,
  data: UpdateUserDepartmentRequest
): Promise<DepartmentMember> {
  return api.patch<DepartmentMember>(
    API_ENDPOINTS.users.update(userId),
    { department_id: data.department_id }
  );
}

/**
 * Set department manager
 * Requirements: 19.3 - Designate room manager
 */
export async function setDepartmentManager(
  departmentId: number,
  data: SetDepartmentManagerRequest
): Promise<Department> {
  return api.post<Department>(
    `${API_ENDPOINTS.departments.detail(departmentId)}set-manager/`,
    data
  );
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch all departments
 * Requirements: 19.1 - Display room list
 */
export function useDepartments() {
  return useQuery({
    queryKey: organizationKeys.departmentList(),
    queryFn: fetchDepartments,
  });
}

/**
 * Hook to fetch department detail
 */
export function useDepartmentDetail(id: number | undefined) {
  return useQuery({
    queryKey: organizationKeys.departmentDetail(id!),
    queryFn: () => fetchDepartmentDetail(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch department members by department ID
 * Requirements: 19.1 - Display members of each room
 */
export function useDepartmentMembersById(id: number | undefined) {
  return useQuery({
    queryKey: organizationKeys.departmentMembers(id!),
    queryFn: () => fetchDepartmentMembersById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to update user's department
 * Requirements: 19.2 - Adjust user's department
 */
export function useUpdateUserDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateUserDepartmentRequest }) =>
      updateUserDepartment(userId, data),
    onSuccess: () => {
      // Invalidate all department-related queries
      queryClient.invalidateQueries({ queryKey: organizationKeys.departments() });
      // Also invalidate user list since department changed
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to set department manager
 * Requirements: 19.3 - Designate room manager
 */
export function useSetDepartmentManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ departmentId, data }: { departmentId: number; data: SetDepartmentManagerRequest }) =>
      setDepartmentManager(departmentId, data),
    onSuccess: (_, variables) => {
      // Invalidate department list and detail
      queryClient.invalidateQueries({ queryKey: organizationKeys.departmentList() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.departmentDetail(variables.departmentId) });
      // Also invalidate user list since roles may have changed
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
