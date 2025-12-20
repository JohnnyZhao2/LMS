import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UserList, Mentor, Role, Department } from '@/types/api';

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
  const { departmentId, isActive, search } = params;

  return useQuery({
    queryKey: ['users', departmentId, isActive, search],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (departmentId) searchParams.set('department_id', String(departmentId));
      if (isActive !== undefined) searchParams.set('is_active', String(isActive));
      if (search) searchParams.set('search', search);

      const queryString = searchParams.toString();
      return apiClient.get<UserList[]>(`/users/${queryString ? `?${queryString}` : ''}`);
    },
  });
};

/**
 * 获取用户详情
 */
export const useUserDetail = (id: number) => {
  return useQuery({
    queryKey: ['user-detail', id],
    queryFn: () => apiClient.get<UserList>(`/users/${id}/`),
    enabled: !!id,
  });
};

/**
 * 获取名下学员（导师使用）
 */
export const useMentees = () => {
  return useQuery({
    queryKey: ['mentees'],
    queryFn: () => apiClient.get<UserList[]>('/users/mentees/'),
  });
};

/**
 * 获取本室成员（室经理使用）
 */
export const useDepartmentMembers = () => {
  return useQuery({
    queryKey: ['department-members'],
    queryFn: () => apiClient.get<UserList[]>('/users/department-members/'),
  });
};

/**
 * 获取导师列表（管理员使用）
 * 用于指定导师时选择可用的导师
 */
export const useMentors = () => {
  return useQuery({
    queryKey: ['mentors'],
    queryFn: () => apiClient.get<Mentor[]>('/users/mentors/'),
  });
};

/**
 * 获取角色列表（管理员使用）
 * 用于分配角色时选择可用的角色
 * 不包含学员角色，学员角色自动保留
 */
export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<Role[]>('/users/roles/'),
  });
};

/**
 * 获取部门列表（管理员使用）
 * 用于创建和编辑用户时选择部门
 */
export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => apiClient.get<Department[]>('/users/departments/'),
  });
};


