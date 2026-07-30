import type {
  PermissionOverrideEffect,
  UserPermissionOverride,
} from '@/types/authorization';
import type { RoleCode } from '@/types/common';

import type { PermissionOverrideEntry } from './user-permission-section.types';

interface OverrideSignatureParts {
  permissionCode: string;
  effect: PermissionOverrideEffect;
  appliesToRole: RoleCode | null;
}

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
