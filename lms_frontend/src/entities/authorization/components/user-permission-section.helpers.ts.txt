import type {
  PermissionOverrideEffect,
  UserPermissionOverride,
  UserScopeGroupOverride,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';

import type { PermissionOverrideEntry, ScopeGroupOverrideEntry } from './user-permission-section.types';

interface OverrideSignatureParts {
  permissionCode: string;
  effect: PermissionOverrideEffect;
  appliesToRole: RoleCode | null;
}

export const normalizeScopeUserIds = (scopeUserIds: number[]): number[] => (
  Array.from(new Set(scopeUserIds)).sort((left, right) => left - right)
);

const buildOverrideSignature = ({
  permissionCode,
  effect,
  appliesToRole,
}: OverrideSignatureParts): string => [
  permissionCode,
  effect,
  appliesToRole ?? 'ALL_ROLES',
].join('|');

export const getOverrideSignature = (override: Pick<
  PermissionOverrideEntry,
  'permissionCode' | 'effect' | 'appliesToRole'
>): string => buildOverrideSignature({
  permissionCode: override.permissionCode,
  effect: override.effect,
  appliesToRole: override.appliesToRole,
});

export const mapPermissionOverrideEntry = (
  override: UserPermissionOverride,
): PermissionOverrideEntry => ({
  id: override.id,
  permissionCode: override.permission_code,
  effect: override.effect,
  appliesToRole: override.applies_to_role,
});

export const mapScopeGroupOverrideEntry = (
  override: UserScopeGroupOverride,
): ScopeGroupOverrideEntry => ({
  id: override.id,
  scopeGroupKey: override.scope_group_key,
  effect: override.effect,
  appliesToRole: override.applies_to_role,
  scopeType: override.scope_type,
  scopeUserIds: normalizeScopeUserIds(override.scope_user_ids),
});
