import type { RoleCode } from './common';

export interface PermissionCatalogItem {
  code: string;
  name: string;
  module: string;
  description: string;
  is_active: boolean;
}

export interface RolePermissionTemplate {
  role_code: RoleCode;
  permission_codes: string[];
  default_scope_types: PermissionOverrideScope[];
  scope_options: PermissionScopeOption[];
}

export type PermissionOverrideEffect = 'ALLOW' | 'DENY';
export type PermissionOverrideScope = 'ALL' | 'SELF' | 'MENTEES' | 'DEPARTMENT' | 'EXPLICIT_USERS';

export interface PermissionScopeOption {
  code: PermissionOverrideScope;
  label: string;
  description: string;
  inherited_by_default: boolean;
}

export interface UserPermissionOverride {
  id: number;
  permission_code: string;
  permission_name: string;
  effect: PermissionOverrideEffect;
  applies_to_role: RoleCode | null;
  scope_type: PermissionOverrideScope;
  scope_user_ids: number[];
  reason: string;
  expires_at: string | null;
  is_active: boolean;
  granted_by_name: string | null;
  revoked_by_name: string | null;
  revoked_at: string | null;
  revoked_reason: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPermissionOverrideRequest {
  permission_code: string;
  effect: PermissionOverrideEffect;
  applies_to_role?: RoleCode | null;
  scope_type: PermissionOverrideScope;
  scope_user_ids?: number[];
  reason?: string;
  expires_at?: string | null;
}
