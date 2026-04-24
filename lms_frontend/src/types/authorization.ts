import type { RoleCode } from './common';

export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  description: string;
  constraint_summary: string;
  scope_aware: boolean;
  scope_group_key: string | null;
  allowed_scope_types: PermissionOverrideScope[];
  implies: string[];
  is_active: boolean;
}

export interface RoleScopeGroup {
  key: string;
  permission_codes: string[];
  default_scope_types: PermissionOverrideScope[];
}

export type PermissionCatalogView = 'role_template' | 'user_authorization';

export interface RolePermissionTemplate {
  role_code: RoleCode;
  permission_codes: string[];
  default_scope_types: PermissionOverrideScope[];
  scope_groups: RoleScopeGroup[];
}

export type PermissionOverrideEffect = 'ALLOW' | 'DENY';
export type PermissionOverrideScope = 'ALL' | 'SELF' | 'MENTEES' | 'DEPARTMENT' | 'EXPLICIT_USERS';

export interface UserPermissionOverride {
  id: number;
  permission_code: string;
  permission_name: string;
  effect: PermissionOverrideEffect;
  applies_to_role: RoleCode | null;
  reason: string;
  expires_at: string | null;
  granted_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPermissionOverrideRequest {
  permission_code: string;
  effect: PermissionOverrideEffect;
  applies_to_role?: RoleCode | null;
  reason?: string;
  expires_at?: string | null;
}

export interface UserScopeGroupOverride {
  id: number;
  scope_group_key: string;
  effect: PermissionOverrideEffect;
  applies_to_role: RoleCode | null;
  scope_type: PermissionOverrideScope;
  scope_user_ids: number[];
  reason: string;
  expires_at: string | null;
  granted_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserScopeGroupOverrideRequest {
  scope_group_key: string;
  effect: PermissionOverrideEffect;
  applies_to_role?: RoleCode | null;
  scope_type: PermissionOverrideScope;
  scope_user_ids?: number[];
  reason?: string;
  expires_at?: string | null;
}

interface PermissionCapability {
  allowed: boolean;
}

export type CapabilityMap = Record<string, PermissionCapability>;
