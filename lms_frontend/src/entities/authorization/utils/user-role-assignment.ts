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
  return getManagedRoleCodes(roles).find((code) => code !== 'STUDENT') ?? null;
}

export function getNextUserPermissionEditorRoleCode({
  currentRoleCode,
  nextRoleCodes,
  toggledRoleCode,
}: {
  currentRoleCode: RoleCode | null;
  nextRoleCodes: RoleCode[];
  toggledRoleCode: RoleCode;
}): RoleCode | null {
  const nextBusinessRoleCode = nextRoleCodes.find((code) => code !== 'STUDENT') ?? null;

  if (toggledRoleCode === 'STUDENT') {
    return currentRoleCode && currentRoleCode !== 'STUDENT' && nextRoleCodes.includes(currentRoleCode)
      ? currentRoleCode
      : nextBusinessRoleCode;
  }

  return nextRoleCodes.includes(toggledRoleCode) ? toggledRoleCode : nextBusinessRoleCode;
}

export function getNextAssignableRoleCodes(currentRoleCodes: RoleCode[], roleCode: RoleCode): RoleCode[] {
  const currentAssignableRoleCodes = currentRoleCodes.filter(isAssignableRoleCode);
  if (roleCode === 'STUDENT') {
    return currentAssignableRoleCodes.includes('STUDENT')
      ? currentAssignableRoleCodes.filter((code) => code !== 'STUDENT')
      : ['STUDENT', ...currentAssignableRoleCodes];
  }

  const studentRoleCodes = currentAssignableRoleCodes.filter((code) => code === 'STUDENT');
  const currentNonStudentRoleCode = currentAssignableRoleCodes.find((code) => code !== 'STUDENT');
  const nextNonStudentRoleCodes = currentNonStudentRoleCode === roleCode ? [] : [roleCode];
  return [...studentRoleCodes, ...nextNonStudentRoleCodes];
}
