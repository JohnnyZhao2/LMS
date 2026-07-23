import {
  useQueries,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import {
  normalizeRoleKey,
  type QueryRole,
} from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';
import type { PermissionCatalogView } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

import {
  getPermissionCatalog,
  getRolePermissionTemplate,
  getUserAuthorization,
  replaceRolePermissionTemplate,
  replaceUserAuthorization,
  resetUserAuthorization,
} from '@/features/user-management/api/authorization-api';

export const authorizationQueryKeys = {
  permissionCatalogRoot: () => ['authorization', 'permission-catalog'] as const,
  permissionCatalog: ({
    currentRole,
    module,
    view,
  }: {
    currentRole: QueryRole;
    module?: string;
    view?: string;
  }) => [
    'authorization',
    'permission-catalog',
    normalizeRoleKey(currentRole),
    module ?? 'ALL',
    view ?? 'ALL',
  ] as const,
  roleTemplatesRoot: () => ['authorization', 'role-template'] as const,
  roleTemplate: ({
    currentRole,
    roleCode,
  }: {
    currentRole: QueryRole;
    roleCode: string;
  }) => ['authorization', 'role-template', normalizeRoleKey(currentRole), roleCode] as const,
  userAuthorizationRoot: () => ['authorization', 'user-authorization'] as const,
  userAuthorization: ({
    currentRole,
    userId,
  }: {
    currentRole: QueryRole;
    userId: number | null;
  }) => [
    'authorization',
    'user-authorization',
    normalizeRoleKey(currentRole),
    userId ?? 'NONE',
  ] as const,
} as const;

/**
 * 用户最终授权变更后失效相关缓存。
 */
export const invalidateAfterUserAuthorizationMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    authorizationQueryKeys.userAuthorizationRoot(),
  ]);

/**
 * 角色模板变更后失效相关缓存。
 */
export const invalidateAfterRoleTemplateMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    authorizationQueryKeys.permissionCatalogRoot(),
    authorizationQueryKeys.roleTemplatesRoot(),
    authorizationQueryKeys.userAuthorizationRoot(),
  ]);

interface PermissionCatalogQuery {
  module?: string;
  view?: PermissionCatalogView;
}

/**
 * 查询权限目录。
 */
export const usePermissionCatalog = (query: PermissionCatalogQuery = {}, enabled = true) => {
  const currentRole = useCurrentRole();
  const { module, view } = query;
  return useQuery({
    queryKey: authorizationQueryKeys.permissionCatalog({ currentRole, module, view }),
    queryFn: () => getPermissionCatalog({ module, view }),
    enabled: currentRole !== null && enabled,
  });
};

/**
 * 批量查询角色权限模板。
 */
export const useRolePermissionTemplates = (
  roleCodes: RoleCode[],
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  return useQueries({
    queries: roleCodes.map((roleCode) => ({
      queryKey: authorizationQueryKeys.roleTemplate({ currentRole, roleCode }),
      queryFn: () => getRolePermissionTemplate(roleCode),
      enabled: currentRole !== null && enabled,
    })),
  });
};

export const useReplaceRolePermissionTemplate = () =>
  useAppMutation(replaceRolePermissionTemplate, invalidateAfterRoleTemplateMutation);

/**
 * 查询用户最终授权。
 */
export const useUserAuthorization = (
  userId: number | null,
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: authorizationQueryKeys.userAuthorization({ currentRole, userId }),
    queryFn: () => getUserAuthorization(userId!),
    enabled: currentRole !== null && Boolean(userId) && enabled,
  });
};

export const useReplaceUserAuthorization = () =>
  useAppMutation(replaceUserAuthorization, invalidateAfterUserAuthorizationMutation);

export const useResetUserAuthorization = () =>
  useAppMutation(resetUserAuthorization, invalidateAfterUserAuthorizationMutation);
