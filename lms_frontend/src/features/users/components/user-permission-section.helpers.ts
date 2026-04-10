import type {
  PermissionOverrideEffect,
  PermissionOverrideScope,
  UserPermissionOverride,
  RoleCode,
} from '@/types/api';

interface OverrideSignatureParts {
  permissionCode: string;
  effect: PermissionOverrideEffect;
  appliesToRole: RoleCode | null;
  scopeType: PermissionOverrideScope;
  scopeUserIds: number[];
}

export const normalizeScopeUserIds = (scopeUserIds: number[]): number[] => (
  Array.from(new Set(scopeUserIds)).sort((left, right) => left - right)
);

const buildOverrideSignature = ({
  permissionCode,
  effect,
  appliesToRole,
  scopeType,
  scopeUserIds,
}: OverrideSignatureParts): string => [
  permissionCode,
  effect,
  appliesToRole ?? 'ALL_ROLES',
  scopeType,
  normalizeScopeUserIds(scopeUserIds).join(','),
].join('|');

export const getOverrideSignature = (override: Pick<
  UserPermissionOverride,
  'permission_code' | 'effect' | 'applies_to_role' | 'scope_type' | 'scope_user_ids'
>): string => buildOverrideSignature({
  permissionCode: override.permission_code,
  effect: override.effect,
  appliesToRole: override.applies_to_role,
  scopeType: override.scope_type,
  scopeUserIds: override.scope_user_ids,
});
