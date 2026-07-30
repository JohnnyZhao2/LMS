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

interface UpdateUserPermissionsPayload {
  userId: number;
  permissionCodes: string[];
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
 * 更新用户权限集合。
 */
export function updateUserPermissions({ userId, permissionCodes }: UpdateUserPermissionsPayload) {
  return apiClient.put<UserPermissions>(
    `/authorization/users/${userId}/permissions/`,
    { permission_codes: permissionCodes },
  );
}
