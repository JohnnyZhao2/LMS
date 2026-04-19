import { ASSIGNABLE_ROLES } from '@/lib/role-config';
import type { RoleCode } from '@/types/common';

type RoleLike = {
  code: string;
};

export function getManagedRoleCodes(roles: RoleLike[]): RoleCode[] {
  return roles
    .map((role) => role.code)
    .filter((roleCode): roleCode is RoleCode => ASSIGNABLE_ROLES.includes(roleCode as RoleCode));
}

export function getSelectedBusinessRoleCode(roles: RoleLike[]): RoleCode | null {
  return getManagedRoleCodes(roles)[0] ?? null;
}
