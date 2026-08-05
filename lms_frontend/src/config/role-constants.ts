import type { RoleCode } from '@/types/common';
import { ROLE_INDICATOR_CLASSES } from '@/lib/role-config'

export { ROLE_INDICATOR_CLASSES }

const ROLE_CODES: RoleCode[] = [
  'STUDENT',
  'MENTOR',
  'DEPT',
  'GLOBAL',
  'SUPER_ADMIN',
]

export const isRoleCode = (value: string | null | undefined): value is RoleCode => {
  if (!value) {
    return false
  }
  return ROLE_CODES.includes(value as RoleCode)
}

export const ROLE_FULL_LABELS: Record<RoleCode, string> = {
  STUDENT: '学员',
  MENTOR: '导师',
  DEPT: '室组',
  GLOBAL: '全局',
  SUPER_ADMIN: '超管',
}

export const ROLE_ORDER: RoleCode[] = ROLE_CODES

/** 授权业务角色（按作用范围区分） */
export const AUTH_ROLES: RoleCode[] = ['MENTOR', 'DEPT', 'GLOBAL']

/** 管理侧工作台角色（不含学员） */
export const MANAGER_ROLES: RoleCode[] = [
  ...AUTH_ROLES,
  'SUPER_ADMIN',
]

/** 学员可进、管理角色也可进的共用入口 */
export const STUDENT_AND_MANAGER_ROLES: RoleCode[] = ['STUDENT', ...MANAGER_ROLES]
