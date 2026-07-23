import type { RoleCode } from '@/types/common';

/** 权限范围种类：无范围 / 数据归属 / 作用对象 */
export type ScopeKind = 'NONE' | 'DATA' | 'TARGET';

/** 范围类型；DATA 用 OWN 表示本人数据，不再用 SELF */
export type ScopeType =
  | 'ALL'
  | 'OWN'
  | 'SELF'
  | 'MENTEES'
  | 'DEPARTMENT'
  | 'EXPLICIT_USERS';

export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  description: string;
  constraint_summary: string;
  scope_aware: boolean;
  scope_kind: ScopeKind;
  scope_group_key: string | null;
  allowed_scope_types: ScopeType[];
  implies: string[];
  is_active: boolean;
  is_configurable: boolean;
  required_role_codes: RoleCode[];
}

export type PermissionCatalogView = 'role_template' | 'user_authorization';

/** API 范围条目（snake_case） */
export interface AuthorizationScopePayload {
  scope_group_key: string;
  scope_type: ScopeType;
  target_user_ids?: number[];
}

/** 角色模板完整授权状态 */
export interface RoleAuthorizationState {
  role_code: RoleCode;
  permission_codes: string[];
  scopes: AuthorizationScopePayload[];
}

/** 用户最终授权状态 */
export interface UserAuthorizationState {
  role_code: RoleCode;
  permission_codes: string[];
  scopes: AuthorizationScopePayload[];
}

/** 前端本地表单范围（camelCase） */
export interface AuthorizationFormScope {
  scopeGroupKey: string;
  scopeType: ScopeType;
  targetUserIds: number[];
}

/** 前端本地表单状态 */
export interface AuthorizationFormState {
  roleCode: RoleCode;
  permissionCodes: string[];
  scopes: AuthorizationFormScope[];
}

interface PermissionCapability {
  allowed: boolean;
}

export type CapabilityMap = Record<string, PermissionCapability>;
