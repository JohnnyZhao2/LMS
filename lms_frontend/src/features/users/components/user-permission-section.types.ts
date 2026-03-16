import type {
  PermissionCatalogItem,
  PermissionOverrideScope,
  UserPermissionOverride,
} from '@/types/api';

export interface ScopeFilterOption {
  value: string;
  label: string;
}

export interface PermissionState {
  checked: boolean;
  fromTemplate: boolean;
  allowOverrides: UserPermissionOverride[];
  denyOverrides: UserPermissionOverride[];
  selectedAllowOverrides: UserPermissionOverride[];
  selectedDenyOverrides: UserPermissionOverride[];
  inheritedSelectedScopeTypes: PermissionOverrideScope[];
  isSelfOnlySelection: boolean;
  hasSelfAllow: boolean;
  hasNonSelfAllow: boolean;
  addedScopeTypes: PermissionOverrideScope[];
  removedScopeTypes: PermissionOverrideScope[];
  effectiveStandardScopeTypes: PermissionOverrideScope[];
  effectiveExplicitUserIds: number[];
  hasExactExplicitAllow: boolean;
  hasExactExplicitDeny: boolean;
  missingSelectedAllowScopeTypes: PermissionOverrideScope[];
}

export type ScopeSummaryFormatter = (
  scopeTypes: PermissionOverrideScope[],
  scopeUserIds?: number[],
) => string;

export type PermissionCatalogEntry = PermissionCatalogItem;
