import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import type {
  AuthorizationScopePayload,
  PermissionCatalogItem,
  PermissionCatalogView,
  RoleAuthorizationState,
  UserAuthorizationState,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';

interface PermissionCatalogQuery {
  module?: string;
  view?: PermissionCatalogView;
}

interface ReplaceUserAuthorizationPayload {
  userId: number;
  data: UserAuthorizationState;
}

interface ReplaceRolePermissionPayload {
  roleCode: RoleCode;
  permissionCodes: string[];
  scopes: AuthorizationScopePayload[];
}

/**
 * 获取权限目录。
 */
export const getPermissionCatalog = ({ module, view }: PermissionCatalogQuery = {}) =>
  apiClient.get<PermissionCatalogItem[]>(
    `/authorization/permissions/${buildQueryString({ module, view })}`,
  );

/**
 * 获取指定角色的权限模板。
 */
export const getRolePermissionTemplate = (roleCode: RoleCode) =>
  apiClient.get<RoleAuthorizationState>(`/authorization/roles/${roleCode}/`);

/**
 * 全量替换角色权限模板。
 */
export const replaceRolePermissionTemplate = ({
  roleCode,
  permissionCodes,
  scopes,
}: ReplaceRolePermissionPayload) =>
  apiClient.put<RoleAuthorizationState>(`/authorization/roles/${roleCode}/`, {
    role_code: roleCode,
    permission_codes: permissionCodes,
    scopes,
  });

/**
 * 获取用户最终授权状态。
 */
export const getUserAuthorization = (userId: number) =>
  apiClient.get<UserAuthorizationState>(`/authorization/users/${userId}/`);

/**
 * 全量替换用户最终授权。
 */
export const replaceUserAuthorization = ({
  userId,
  data,
}: ReplaceUserAuthorizationPayload) =>
  apiClient.put<UserAuthorizationState>(`/authorization/users/${userId}/`, data);

/**
 * 将用户授权重置为角色模板。
 */
export const resetUserAuthorization = (userId: number) =>
  apiClient.post<UserAuthorizationState>(
    `/authorization/users/${userId}/reset-to-role/`,
  );
