import { MANAGEMENT_ROLE_CODES } from '@/entities/authorization/constants/access';
import type { RoleCode } from '@/types/common';

type RoleLike = {
  code: string;
};

export function isAssignableRoleCode(roleCode: string): roleCode is RoleCode {
  return MANAGEMENT_ROLE_CODES.includes(roleCode as RoleCode);
}

export function getManagedRoleCodes(roles: RoleLike[]): RoleCode[] {
  return roles.map((role) => role.code).filter(isAssignableRoleCode);
}

/** 管理角色单选；空表示普通员工 */
export function getNextFormRoleCodes(current: RoleCode[], clicked: RoleCode): RoleCode[] {
  return current.includes(clicked) ? [] : [clicked];
}
