import type { PermissionOverrideScope, UserPermissionOverride } from '@/types/authorization';

export interface ScopeFilterOption {
  value: string;
  label: string;
}

export interface PermissionState {
  checked: boolean;
  enableBlockedReason: string | null;
  disableBlockedReason: string | null;
  fromTemplate: boolean;
  allowOverrides: UserPermissionOverride[];
  denyOverrides: UserPermissionOverride[];
  selectedAllowOverrides: UserPermissionOverride[];
  selectedDenyOverrides: UserPermissionOverride[];
  inheritedSelectedScopeTypes: PermissionOverrideScope[];
  isSelfOnlySelection: boolean;
  hasSelfAllow: boolean;
  hasNonSelfAllow: boolean;
  hasExactExplicitAllow: boolean;
  missingSelectedAllowScopeTypes: PermissionOverrideScope[];
}
