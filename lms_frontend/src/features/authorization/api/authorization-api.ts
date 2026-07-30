import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';

export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  description: string;
  constraint_summary: string;
  is_active: boolean;
}

export interface UserPermissions {
  permission_codes: string[];
}

interface PermissionCatalogQuery {
  module?: string;
}

interface UserPermissionMutationPayload {
  userId: number;
  permissionCode: string;
}

/**
 * 获取权限目录。
 */
export function getPermissionCatalog(query: PermissionCatalogQuery = {}) {
  const queryString = buildQueryString({ module: query.module });
  return apiClient.get<PermissionCatalogItem[]>(`/authorization/permissions/${queryString}`);
}

/**
 * 获取用户已授权权限码。
 */
export function getUserPermissions(userId: number) {
  return apiClient.get<UserPermissions>(`/authorization/users/${userId}/permissions/`);
}

/**
 * 授予用户单项权限。
 */
export function grantUserPermission({ userId, permissionCode }: UserPermissionMutationPayload) {
  return apiClient.put<UserPermissions>(
    `/authorization/users/${userId}/permissions/${permissionCode}/`,
  );
}

/**
 * 撤销用户单项权限。
 */
export function revokeUserPermission({ userId, permissionCode }: UserPermissionMutationPayload) {
  return apiClient.delete<UserPermissions>(
    `/authorization/users/${userId}/permissions/${permissionCode}/`,
  );
}
