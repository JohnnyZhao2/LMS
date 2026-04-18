import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { UserList, Mentor, Role, Department } from '@/types/common';

export const allowedDepartmentOrder: Department['code'][] = ['DEPT1', 'DEPT2'];
export const allowedDepartmentCodes = new Set(allowedDepartmentOrder);
const departmentDisplayNameMap: Record<string, string> = {
  DEPT1: '一室',
  DEPT2: '二室',
};

export const isAllowedDepartmentCode = (code?: string | null): code is Department['code'] =>
  Boolean(code) && allowedDepartmentCodes.has(code as Department['code']);

/**
 * 仅保留需求定义的一室/二室，并强制其显示名称
 * @param departments 原始部门列表
 * @returns 只包含一室/二室且顺序固定的部门列表
 */
const normalizeDepartments = (departments: Department[]) =>
  departments
    .filter((dept) => allowedDepartmentCodes.has(dept.code))
    .map((dept) => ({
      ...dept,
      name: departmentDisplayNameMap[dept.code] ?? dept.name,
    }))
    .sort(
      (a, b) => allowedDepartmentOrder.indexOf(a.code) - allowedDepartmentOrder.indexOf(b.code),
    );

interface GetUsersParams {
  departmentId?: number;
  mentorId?: number;
  isActive?: boolean;
  search?: string;
}

interface UseUsersOptions {
  enabled?: boolean;
}

/**
 * 获取用户列表
 */
export const useUsers = (params: GetUsersParams = {}, options: UseUsersOptions = {}) => {
  const currentRole = useCurrentRole();
  const { departmentId, mentorId, isActive, search } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['users', currentRole ?? 'UNKNOWN', departmentId, mentorId, isActive, search],
    queryFn: () => {
      const queryParams = {
        ...(departmentId && { department_id: String(departmentId) }),
        ...(mentorId && { mentor_id: String(mentorId) }),
        ...(isActive !== undefined && { is_active: String(isActive) }),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<UserList[]>(`/users${queryString}`);
    },
    enabled: currentRole !== null && enabled,
  });
};

/**
 * 获取用户详情
 */
export const useUserDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['user-detail', currentRole ?? 'UNKNOWN', id],
    queryFn: () => apiClient.get<UserList>(`/users/${id}/`),
    enabled: !!id && currentRole !== null,
  });
};

/**
 * 获取导师列表（管理员使用）
 * 用于指定导师时选择可用的导师
 */
export const useMentors = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['mentors', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<Mentor[]>('/users/mentors/'),
    enabled: currentRole !== null,
  });
};

/**
 * 获取角色列表（管理员使用）
 * 用于分配角色时选择可用的角色
 * 不包含学员角色，学员角色自动保留
 */
export const useRoles = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['roles', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<Role[]>('/users/roles/'),
    enabled: currentRole !== null,
  });
};

/**
 * 获取部门列表（管理员使用）
 * 用于创建和编辑用户时选择部门
 */
export const useDepartments = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['departments', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<Department[]>('/users/departments/'),
    select: normalizeDepartments,
    enabled: currentRole !== null,
  });
};
