import type { RoleCode } from './common';

export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  description: string;
  constraint_summary: string;
  scope_aware: boolean;
  scope_group_key: string | null;
  implies: string[];
  is_active: boolean;
}

export interface RoleScopeGroup {
  key: string;
  permission_codes: string[];
  default_scope_types: PermissionOverrideScope[];
}

export type PermissionCatalogView = 'user_authorization';

/** 角色固定能力（只读，代码声明） */
export interface RoleCapability {
  role_code: RoleCode;
  permission_codes: string[];
  default_scope_types: PermissionOverrideScope[];
  scope_groups: RoleScopeGroup[];
}

export type PermissionOverrideEffect = 'ALLOW' | 'DENY';
export type PermissionOverrideScope = 'ALL' | 'SELF' | 'MENTEES' | 'DEPARTMENT';

export interface UserPermissionOverride {
  id: number;
  permission_code: string;
  permission_name: string;
  effect: PermissionOverrideEffect;
  applies_to_role: RoleCode | null;
  granted_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPermissionOverrideRequest {
  permission_code: string;
  effect: PermissionOverrideEffect;
  applies_to_role?: RoleCode | null;
}

interface PermissionCapability {
  allowed: boolean;
}

export type CapabilityMap = Record<string, PermissionCapability>;
