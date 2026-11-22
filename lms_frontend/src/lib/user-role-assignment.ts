import { BUILTIN_PRIMARY_ROLE_CODES, LEARNER_ROLE_VALUE } from '@/config/authorization';
import type { BuiltinRoleCode, RoleCode } from '@/types/common';

export type PrimaryIdentityValue = BuiltinRoleCode | typeof LEARNER_ROLE_VALUE;

export const isBuiltinPrimaryRole = (code: string): code is BuiltinRoleCode =>
  BUILTIN_PRIMARY_ROLE_CODES.includes(code as BuiltinRoleCode);

/** 从角色列表中提取常规身份（ADMIN / DEPT_MANAGER / MENTOR / __LEARNER__） */
export function getPrimaryIdentity(roleCodes: readonly RoleCode[]): PrimaryIdentityValue {
  for (const primary of BUILTIN_PRIMARY_ROLE_CODES) {
    if (roleCodes.includes(primary)) {
      return primary;
    }
  }
  return LEARNER_ROLE_VALUE;
}

/** 从角色列表中提取所有专项（自定义）角色编码 */
export function getSpecialtyRoleCodes(roleCodes: readonly RoleCode[]): RoleCode[] {
  return roleCodes.filter((code) => !isBuiltinPrimaryRole(code));
}

/**
 * 组合最终提交的 role_codes：
 * - 管理员已拥有全局全量权限，直接返回 ['ADMIN']，不叠加专项角色
 * - 普通学员仅返回已选专项角色
 * - 室经理/导师返回 [常规身份, ...专项角色]
 */
export function composeRoleCodes(
  primary: PrimaryIdentityValue,
  specialtyCodes: readonly RoleCode[],
): RoleCode[] {
  if (primary === 'ADMIN') {
    return ['ADMIN'];
  }
  const uniqueSpecialties = Array.from(new Set(specialtyCodes.filter((code) => !isBuiltinPrimaryRole(code))));
  if (primary === LEARNER_ROLE_VALUE) {
    return uniqueSpecialties;
  }
  return [primary, ...uniqueSpecialties];
}
