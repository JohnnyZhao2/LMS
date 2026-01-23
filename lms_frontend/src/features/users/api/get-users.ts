import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { UserList, Mentor, Role, Department } from '@/types/api';

const allowedDepartmentOrder: Department['code'][] = ['DEPT1', 'DEPT2'];
const allowedDepartmentCodes = new Set(allowedDepartmentOrder);
const departmentDisplayNameMap: Record<string, string> = {
  DEPT1: '一室',
  DEPT2: '二室',
};

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
  isActive?: boolean;
  search?: string;
}

/**
 * 获取用户列表
 * 后端返回简单数组，不支持分页
 */
export const useUsers = (params: GetUsersParams = {}) => {
  const currentRole = useCurrentRole();
  const { departmentId, isActive, search } = params;

  return useQuery({
    queryKey: ['users', currentRole ?? 'UNKNOWN', departmentId, isActive, search],
    queryFn: () => {
      const queryParams = {
        ...(departmentId && { department_id: String(departmentId) }),
        ...(isActive !== undefined && { is_active: String(isActive) }),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<UserList[]>(`/users${queryString}`);
    },
    enabled: currentRole !== null,
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
 * 获取名下学员（导师使用）
 */
export const useMentees = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['mentees', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<UserList[]>('/users/mentees/'),
    enabled: currentRole !== null,
  });
};

/**
 * 获取本室成员（室经理使用）
 */
export const useDepartmentMembers = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['department-members', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<UserList[]>('/users/department-members/'),
    enabled: currentRole !== null,
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
