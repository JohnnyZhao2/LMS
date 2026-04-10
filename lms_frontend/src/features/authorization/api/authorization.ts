import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';
import type {
  CreateUserPermissionOverrideRequest,
  PermissionCatalogItem,
  PermissionCatalogView,
  RoleCode,
  RolePermissionTemplate,
  UserPermissionOverride,
} from '@/types/api';

interface PermissionCatalogQuery {
  module?: string;
  view?: PermissionCatalogView;
}

interface ReplaceRolePermissionPayload {
  roleCode: RoleCode;
  permissionCodes: string[];
}

interface CreateUserOverridePayload {
  userId: number;
  data: CreateUserPermissionOverrideRequest;
}

interface RevokeUserOverridePayload {
  userId: number;
  overrideId: number;
  revokeReason?: string;
}

export const usePermissionCatalog = (query: PermissionCatalogQuery = {}, enabled = true) => {
  const currentRole = useCurrentRole();
  const { module, view } = query;
  return useQuery({
    queryKey: ['authorization', 'permission-catalog', currentRole ?? 'UNKNOWN', module ?? 'ALL', view ?? 'ALL'],
    queryFn: () => {
      const queryString = buildQueryString({ module, view });
      return apiClient.get<PermissionCatalogItem[]>(`/authorization/permissions/${queryString}`);
    },
    enabled: currentRole !== null && enabled,
  });
};

export const useVisiblePermissionCatalog = (view: PermissionCatalogView, enabled = true) => (
  usePermissionCatalog({ view }, enabled)
);

export const useRolePermissionTemplates = (roleCodes: RoleCode[], enabled = true) => {
  const currentRole = useCurrentRole();

  return useQueries({
    queries: roleCodes.map((roleCode) => ({
      queryKey: ['authorization', 'role-template', currentRole ?? 'UNKNOWN', roleCode],
      queryFn: () => apiClient.get<RolePermissionTemplate>(`/authorization/roles/${roleCode}/permissions/`),
      enabled: currentRole !== null && enabled,
    })),
  });
};

export const useReplaceRolePermissionTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleCode, permissionCodes }: ReplaceRolePermissionPayload) =>
      apiClient.put<RolePermissionTemplate>(`/authorization/roles/${roleCode}/permissions/`, {
        role_code: roleCode,
        permission_codes: permissionCodes,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['authorization', 'role-template'] }),
        queryClient.invalidateQueries({ queryKey: ['authorization', 'permission-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['authorization', 'user-overrides'] }),
      ]);
    },
  });
};

export const useUserPermissionOverrides = (
  userId: number | null,
  includeInactive = false,
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['authorization', 'user-overrides', currentRole ?? 'UNKNOWN', userId ?? 'NONE', includeInactive],
    queryFn: () => {
      if (!userId) {
        return Promise.resolve([] as UserPermissionOverride[]);
      }
      const queryString = buildQueryString({ include_inactive: includeInactive });
      return apiClient.get<UserPermissionOverride[]>(`/authorization/users/${userId}/overrides/${queryString}`);
    },
    enabled: currentRole !== null && !!userId && enabled,
  });
};

export const useCreateUserPermissionOverride = () => {
  return useMutation({
    mutationFn: ({ userId, data }: CreateUserOverridePayload) =>
      apiClient.post<UserPermissionOverride>(`/authorization/users/${userId}/overrides/`, data),
  });
};

export const useRevokeUserPermissionOverride = () => {
  return useMutation({
    mutationFn: ({ userId, overrideId, revokeReason }: RevokeUserOverridePayload) =>
      apiClient.post<UserPermissionOverride>(
        `/authorization/users/${userId}/overrides/${overrideId}/revoke/`,
        { revoke_reason: revokeReason ?? '' },
      ),
  });
};
