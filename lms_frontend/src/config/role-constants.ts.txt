import type { RoleCode } from '@/types/common';
import { ROLE_INDICATOR_CLASSES } from '@/lib/role-config'

export { ROLE_INDICATOR_CLASSES }

const ROLE_CODES: RoleCode[] = [
  'STUDENT',
  'MENTOR',
  'DEPT_MANAGER',
  'TEAM_MANAGER',
  'ADMIN',
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
  DEPT_MANAGER: '室经理',
  ADMIN: '管理员',
  TEAM_MANAGER: '团队经理',
  SUPER_ADMIN: '超管',
}

export const ROLE_ORDER: RoleCode[] = ROLE_CODES
