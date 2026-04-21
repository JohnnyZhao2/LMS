import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation';
import type { UserInfo, UserList, RoleCode } from '@/types/common';

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

interface ChangePasswordRequest {
  userId: number;
  password: string;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => apiClient.post<UserList>('/users/', data),
    onSuccess: () => invalidateAfterUserMutation(queryClient, { includeAssignableUsers: true }),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      apiClient.patch<UserList>(`/users/${id}/`, data),
    onSuccess: () => invalidateAfterUserMutation(queryClient, {
      includeMentors: true,
      includeAssignableUsers: true,
    }),
  });
};

export const useUpdateMyAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAvatarRequest) => apiClient.patch<UserInfo>('/users/me/avatar/', data),
    onSuccess: () => invalidateAfterUserMutation(queryClient, {
      includeMentors: true,
      includeAssignableUsers: true,
    }),
  });
};

export const useUpdateUserAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAvatarRequest }) =>
      apiClient.patch<UserList>(`/users/${id}/avatar/`, data),
    onSuccess: () => invalidateAfterUserMutation(queryClient, {
      includeMentors: true,
      includeAssignableUsers: true,
    }),
  });
};

export const useActivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.post<UserList>(`/users/${id}/activate/`),
    onSuccess: () => invalidateAfterUserMutation(queryClient, {
      includeMentors: true,
      includeAssignableUsers: true,
    }),
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.post<UserList>(`/users/${id}/deactivate/`),
    onSuccess: () => invalidateAfterUserMutation(queryClient, {
      includeMentors: true,
      includeAssignableUsers: true,
    }),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete<void>(`/users/${id}/`),
    onSuccess: () => invalidateAfterUserMutation(queryClient, {
      includeMentors: true,
      includeAssignableUsers: true,
    }),
  });
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, password }: ChangePasswordRequest) =>
      apiClient.post<void>('/auth/change-password/', {
        user_id: userId,
        password,
      }),
    onSuccess: () => invalidateAfterUserMutation(queryClient),
  });
};

export const useAssignRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: RoleCode[] }) =>
      apiClient.post<UserList>(`/users/${id}/assign-roles/`, { role_codes: roles }),
    onSuccess: () => invalidateAfterUserMutation(queryClient, {
      includeMentors: true,
      includeAssignableUsers: true,
    }),
  });
};

export const useAssignMentor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mentorId }: { id: number; mentorId: number | null }) =>
      apiClient.post<UserList>(`/users/${id}/assign-mentor/`, { mentor_id: mentorId }),
    onSuccess: () => invalidateAfterUserMutation(queryClient, { includeAssignableUsers: true }),
  });
};
