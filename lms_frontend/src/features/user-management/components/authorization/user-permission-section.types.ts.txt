import type { PermissionOverrideEffect, PermissionOverrideScope } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

export interface PermissionOverrideEntry {
  id: number;
  permissionCode: string;
  effect: PermissionOverrideEffect;
  appliesToRole: RoleCode | null;
}

export interface ScopeGroupOverrideEntry {
  id: number;
  scopeGroupKey: string;
  effect: PermissionOverrideEffect;
  appliesToRole: RoleCode | null;
  scopeType: PermissionOverrideScope;
  scopeUserIds: number[];
}

export interface ScopeFilterOption {
  value: string;
  label: string;
}

export interface PermissionState {
  checked: boolean;
  enableBlockedReason: string | null;
  disableBlockedReason: string | null;
  fromTemplate: boolean;
  allowOverrides: PermissionOverrideEntry[];
  denyOverrides: PermissionOverrideEntry[];
}
