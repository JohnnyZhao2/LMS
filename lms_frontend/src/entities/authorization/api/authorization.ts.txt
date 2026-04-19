import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import {
  invalidateAfterAuthorizationOverrideMutation,
  invalidateAfterRoleTemplateMutation,
} from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type {
  CreateUserPermissionOverrideRequest,
  CreateUserScopeGroupOverrideRequest,
  PermissionCatalogItem,
  PermissionCatalogView,
  RolePermissionTemplate,
  UserPermissionOverride,
  UserScopeGroupOverride,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';

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

interface CreateUserScopeGroupOverridePayload {
  userId: number;
  data: CreateUserScopeGroupOverrideRequest;
}

export const usePermissionCatalog = (query: PermissionCatalogQuery = {}, enabled = true) => {
  const currentRole = useCurrentRole();
  const { module, view } = query;
  return useQuery({
    queryKey: queryKeys.authorization.permissionCatalog({ currentRole, module, view }),
    queryFn: () => {
      const queryString = buildQueryString({ module, view });
      return apiClient.get<PermissionCatalogItem[]>(`/authorization/permissions/${queryString}`);
    },
    enabled: currentRole !== null && enabled,
  });
};

export const useRolePermissionTemplates = (roleCodes: RoleCode[], enabled = true) => {
  const currentRole = useCurrentRole();

  return useQueries({
    queries: roleCodes.map((roleCode) => ({
      queryKey: queryKeys.authorization.roleTemplate({ currentRole, roleCode }),
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
    onSuccess: () => invalidateAfterRoleTemplateMutation(queryClient),
  });
};

export const useUserPermissionOverrides = (
  userId: number | null,
  includeInactive = false,
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.authorization.userOverrides({ currentRole, userId, includeInactive }),
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

export const useUserScopeGroupOverrides = (
  userId: number | null,
  includeInactive = false,
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.authorization.userScopeGroupOverrides({ currentRole, userId, includeInactive }),
    queryFn: () => {
      if (!userId) {
        return Promise.resolve([] as UserScopeGroupOverride[]);
      }
      const queryString = buildQueryString({ include_inactive: includeInactive });
      return apiClient.get<UserScopeGroupOverride[]>(`/authorization/users/${userId}/scope-group-overrides/${queryString}`);
    },
    enabled: currentRole !== null && !!userId && enabled,
  });
};

export const useCreateUserPermissionOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: CreateUserOverridePayload) =>
      apiClient.post<UserPermissionOverride>(`/authorization/users/${userId}/overrides/`, data),
    onSuccess: () => invalidateAfterAuthorizationOverrideMutation(queryClient),
  });
};

export const useRevokeUserPermissionOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, overrideId, revokeReason }: RevokeUserOverridePayload) =>
      apiClient.post<UserPermissionOverride>(
        `/authorization/users/${userId}/overrides/${overrideId}/revoke/`,
        { revoke_reason: revokeReason ?? '' },
      ),
    onSuccess: () => invalidateAfterAuthorizationOverrideMutation(queryClient),
  });
};

export const useCreateUserScopeGroupOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: CreateUserScopeGroupOverridePayload) =>
      apiClient.post<UserScopeGroupOverride>(`/authorization/users/${userId}/scope-group-overrides/`, data),
    onSuccess: () => invalidateAfterAuthorizationOverrideMutation(queryClient),
  });
};

export const useRevokeUserScopeGroupOverride = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, overrideId, revokeReason }: RevokeUserOverridePayload) =>
      apiClient.post<UserScopeGroupOverride>(
        `/authorization/users/${userId}/scope-group-overrides/${overrideId}/revoke/`,
        { revoke_reason: revokeReason ?? '' },
      ),
    onSuccess: () => invalidateAfterAuthorizationOverrideMutation(queryClient),
  });
};
