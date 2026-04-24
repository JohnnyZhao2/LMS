import { ASSIGNABLE_ROLES } from '@/lib/role-config';
import type { RoleCode } from '@/types/common';

type RoleLike = {
  code: string;
};

export function isAssignableRoleCode(roleCode: string): roleCode is RoleCode {
  return ASSIGNABLE_ROLES.includes(roleCode as RoleCode);
}

export function getManagedRoleCodes(roles: RoleLike[]): RoleCode[] {
  return roles
    .map((role) => role.code)
    .filter(isAssignableRoleCode);
}

export function getSelectedBusinessRoleCode(roles: RoleLike[]): RoleCode | null {
  return getManagedRoleCodes(roles)[0] ?? null;
}

export function getNextAssignableRoleCodes(currentRoleCodes: RoleCode[], roleCode: RoleCode): RoleCode[] {
  const currentAssignableRoleCodes = currentRoleCodes.filter(isAssignableRoleCode);
  return currentAssignableRoleCodes.includes(roleCode) ? [] : [roleCode];
}
