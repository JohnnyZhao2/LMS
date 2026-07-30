import type { PermissionOverrideEffect } from '@/types/authorization';
import type { RoleCode } from '@/types/common';

export interface PermissionOverrideEntry {
  id: number;
  permissionCode: string;
  effect: PermissionOverrideEffect;
  appliesToRole: RoleCode | null;
}

export interface PermissionState {
  checked: boolean;
  enableBlockedReason: string | null;
  disableBlockedReason: string | null;
  fromTemplate: boolean;
  allowOverrides: PermissionOverrideEntry[];
  denyOverrides: PermissionOverrideEntry[];
}
