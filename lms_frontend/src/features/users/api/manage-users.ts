import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UserList, RoleCode } from '@/types/api';

interface CreateUserRequest {
  password: string;
  employee_id: string;
  username: string;
  department_id?: number;
  mentor_id?: number | null;
}

interface UpdateUserRequest {
  username?: string;
  employee_id?: string;
  department_id?: number | null;
}

/**
 * 创建用户
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => apiClient.post<UserList>('/users/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/**
 * 更新用户
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      apiClient.patch<UserList>(`/users/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail'] });
    },
  });
};

/**
 * 启用用户
 */
export const useActivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.post<UserList>(`/users/${id}/activate/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail'] });
      // 启用用户可能影响导师列表（导师列表只显示活跃用户）
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
    },
  });
};

/**
 * 停用用户
 */
export const useDeactivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.post<UserList>(`/users/${id}/deactivate/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail'] });
      // 停用用户可能影响导师列表（导师列表只显示活跃用户）
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
    },
  });
};

/**
 * 重置密码（管理员操作）
 * 接口在认证模块，需要传入 user_id
 */
export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) =>
      apiClient.post<{ temporary_password: string; message: string }>('/auth/reset-password/', {
        user_id: userId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail'] });
    },
  });
};

/**
 * 分配角色
 */
export const useAssignRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: RoleCode[] }) =>
      apiClient.post<UserList>(`/users/${id}/assign-roles/`, { role_codes: roles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail'] });
      // 分配角色可能影响导师列表（用户可能成为或失去导师角色）
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
    },
  });
};

/**
 * 指定导师
 * mentorId 为 null 时解除绑定
 */
export const useAssignMentor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mentorId }: { id: number; mentorId: number | null }) =>
      apiClient.post<UserList>(`/users/${id}/assign-mentor/`, { mentor_id: mentorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail'] });
    },
  });
};


