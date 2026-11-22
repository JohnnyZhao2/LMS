import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterRoleMutation } from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreateRolePayload,
  PermissionCatalogItem,
  RoleItem,
  UpdateRolePayload,
} from '@/features/authorization/types';

export const usePermissionCatalog = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.authorization.permissionCatalog(),
    queryFn: () => apiClient.get<PermissionCatalogItem[]>('/authorization/permissions/'),
    enabled,
  });
};

export const useAuthorizationRoles = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.authorization.roles(),
    queryFn: () => apiClient.get<RoleItem[]>('/authorization/roles/'),
    enabled,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRolePayload) =>
      apiClient.post<RoleItem>('/authorization/roles/', payload),
    onSuccess: () => invalidateAfterRoleMutation(queryClient),
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleCode, ...body }: UpdateRolePayload) =>
      apiClient.patch<RoleItem>(`/authorization/roles/${roleCode}/`, body),
    onSuccess: () => invalidateAfterRoleMutation(queryClient),
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleCode: string) =>
      apiClient.delete<void>(`/authorization/roles/${roleCode}/`),
    onSuccess: () => invalidateAfterRoleMutation(queryClient),
  });
};
