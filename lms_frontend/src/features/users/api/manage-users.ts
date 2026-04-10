import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UserInfo, UserList, RoleCode } from '@/types/common';

const invalidateUserQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  includeMentors = false,
  includeAssignableUsers = false,
) => {
  queryClient.invalidateQueries({ queryKey: ['users'] });
  queryClient.invalidateQueries({ queryKey: ['user-detail'] });
  if (includeMentors) {
    queryClient.invalidateQueries({ queryKey: ['mentors'] });
  }
  if (includeAssignableUsers) {
    queryClient.invalidateQueries({ queryKey: ['assignable-users'] });
  }
};

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
  role_codes?: RoleCode[];
}

interface UpdateAvatarRequest {
  avatar_key: string;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => apiClient.post<UserList>('/users/', data),
    onSuccess: () => invalidateUserQueries(queryClient, false, true),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      apiClient.patch<UserList>(`/users/${id}/`, data),
    onSuccess: () => invalidateUserQueries(queryClient, true, true),
  });
};

export const useUpdateMyAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAvatarRequest) => apiClient.patch<UserInfo>('/users/me/avatar/', data),
    onSuccess: () => invalidateUserQueries(queryClient, true, true),
  });
};

export const useUpdateUserAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAvatarRequest }) =>
      apiClient.patch<UserList>(`/users/${id}/avatar/`, data),
    onSuccess: () => invalidateUserQueries(queryClient, true, true),
  });
};

export const useActivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.post<UserList>(`/users/${id}/activate/`),
    onSuccess: () => invalidateUserQueries(queryClient, true, true),
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.post<UserList>(`/users/${id}/deactivate/`),
    onSuccess: () => invalidateUserQueries(queryClient, true, true),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete<void>(`/users/${id}/`),
    onSuccess: () => invalidateUserQueries(queryClient, true, true),
  });
};

export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) =>
      apiClient.post<{ temporary_password: string; message: string }>('/auth/reset-password/', {
        user_id: userId,
      }),
    onSuccess: () => invalidateUserQueries(queryClient),
  });
};

export const useAssignRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: RoleCode[] }) =>
      apiClient.post<UserList>(`/users/${id}/assign-roles/`, { role_codes: roles }),
    onSuccess: () => invalidateUserQueries(queryClient, true, true),
  });
};

export const useAssignMentor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mentorId }: { id: number; mentorId: number | null }) =>
      apiClient.post<UserList>(`/users/${id}/assign-mentor/`, { mentor_id: mentorId }),
    onSuccess: () => invalidateUserQueries(queryClient, false, true),
  });
};
