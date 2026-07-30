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

/**
 * 去掉全部授权角色，仅保留学员。
 */
export function withoutAuthRoles(roleCodes: RoleCode[]): RoleCode[] {
  return roleCodes.filter((code) => code === 'STUDENT');
}

export function getNextAssignableRoleCodes(currentRoleCodes: RoleCode[], roleCode: RoleCode): RoleCode[] {
  const currentAssignableRoleCodes = currentRoleCodes.filter(isAssignableRoleCode);
  if (roleCode === 'STUDENT') {
    return currentAssignableRoleCodes.includes('STUDENT')
      ? currentAssignableRoleCodes.filter((code) => code !== 'STUDENT')
      : ['STUDENT', ...currentAssignableRoleCodes.filter((code) => code !== 'STUDENT')];
  }

  // 授权角色互斥：点掉任一授权角色时清空全部授权角色，避免脏数据残留
  if (currentAssignableRoleCodes.includes(roleCode)) {
    return withoutAuthRoles(currentAssignableRoleCodes);
  }
  return [...withoutAuthRoles(currentAssignableRoleCodes), roleCode];
}
