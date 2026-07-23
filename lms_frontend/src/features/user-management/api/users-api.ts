import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import type { Department, Mentor, Role, UserInfo, UserList } from '@/types/common';
import type {
  ChangePasswordRequest,
  CreateUserRequest,
  UpdateAvatarRequest,
  UpdateUserRequest,
} from '@/types/user-api';

export interface GetUsersParams {
  departmentId?: number;
  mentorId?: number;
  isActive?: boolean;
  search?: string;
}

export const allowedDepartmentOrder: Department['code'][] = ['DEPT1', 'DEPT2'];
export const allowedDepartmentCodes = new Set(allowedDepartmentOrder);

const departmentDisplayNameMap: Record<string, string> = {
  DEPT1: '一室',
  DEPT2: '二室',
};

/**
 * 判断部门编码是否在允许列表中。
 */
export const isAllowedDepartmentCode = (code?: string | null): code is Department['code'] =>
  Boolean(code) && allowedDepartmentCodes.has(code as Department['code']);

/**
 * 规范化部门列表：过滤、重命名并排序。
 */
export const normalizeDepartments = (departments: Department[]) =>
  departments
    .filter((department) => allowedDepartmentCodes.has(department.code))
    .map((department) => ({
      ...department,
      name: departmentDisplayNameMap[department.code] ?? department.name,
    }))
    .sort(
      (left, right) =>
        allowedDepartmentOrder.indexOf(left.code) - allowedDepartmentOrder.indexOf(right.code),
    );

/**
 * 获取用户列表。
 */
export const getUsers = ({ departmentId, mentorId, isActive, search }: GetUsersParams = {}) => {
  const queryString = buildQueryString({
    ...(departmentId && { department_id: String(departmentId) }),
    ...(mentorId && { mentor_id: String(mentorId) }),
    ...(isActive !== undefined && { is_active: String(isActive) }),
    ...(search && { search }),
  });
  return apiClient.get<UserList[]>(`/users${queryString}`);
};

/**
 * 获取用户详情。
 */
export const getUser = (id: number) => apiClient.get<UserList>(`/users/${id}/`);

/**
 * 创建用户。
 */
export const createUser = (data: CreateUserRequest) => apiClient.post<UserList>('/users/', data);

/**
 * 更新用户。
 */
export const updateUser = ({ id, data }: { id: number; data: UpdateUserRequest }) =>
  apiClient.patch<UserList>(`/users/${id}/`, data);

/**
 * 删除用户。
 */
export const deleteUser = (id: number) => apiClient.delete<void>(`/users/${id}/`);

/**
 * 启用用户。
 */
export const activateUser = (id: number) =>
  apiClient.post<UserList>(`/users/${id}/activate/`);

/**
 * 停用用户。
 */
export const deactivateUser = (id: number) =>
  apiClient.post<UserList>(`/users/${id}/deactivate/`);

/**
 * 获取部门列表。
 */
export const getDepartments = () => apiClient.get<Department[]>('/users/departments/');

/**
 * 获取导师列表。
 */
export const getMentors = () => apiClient.get<Mentor[]>('/users/mentors/');

/**
 * 获取角色列表。
 */
export const getRoles = () => apiClient.get<Role[]>('/users/roles/');

/**
 * 修改用户密码。
 */
export const changeUserPassword = ({ userId, password }: ChangePasswordRequest) =>
  apiClient.post<void>('/auth/change-password/', { user_id: userId, password });

/**
 * 更新指定用户头像。
 */
export const updateUserAvatar = ({ id, data }: { id: number; data: UpdateAvatarRequest }) =>
  apiClient.patch<UserList>(`/users/${id}/avatar/`, data);

/**
 * 更新当前登录用户头像。
 */
export const updateMyAvatar = (data: UpdateAvatarRequest) =>
  apiClient.patch<UserInfo>('/users/me/avatar/', data);
