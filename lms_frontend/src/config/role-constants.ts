import type { RoleCode } from '@/types/api'

export const ROLE_SHORT_LABELS: Record<RoleCode, string> = {
  STUDENT: '学',
  MENTOR: '师',
  DEPT_MANAGER: '室',
  ADMIN: '管',
  TEAM_MANAGER: '团',
  SUPER_ADMIN: '超',
}

export const ROLE_FULL_LABELS: Record<RoleCode, string> = {
  STUDENT: '学员',
  MENTOR: '导师',
  DEPT_MANAGER: '室经理',
  ADMIN: '管理员',
  TEAM_MANAGER: '团队经理',
  SUPER_ADMIN: '超管',
}

export const ROLE_INDICATOR_CLASSES: Record<RoleCode, { bar: string; glow: string }> = {
  STUDENT: { bar: 'bg-sky-400', glow: 'bg-sky-400/80' },
  MENTOR: { bar: 'bg-emerald-400', glow: 'bg-emerald-400/80' },
  DEPT_MANAGER: { bar: 'bg-violet-400', glow: 'bg-violet-400/80' },
  TEAM_MANAGER: { bar: 'bg-amber-400', glow: 'bg-amber-400/80' },
  ADMIN: { bar: 'bg-rose-400', glow: 'bg-rose-400/80' },
  SUPER_ADMIN: { bar: 'bg-red-500', glow: 'bg-red-500/80' },
}

export const ROLE_ORDER: RoleCode[] = [
  'STUDENT',
  'MENTOR',
  'DEPT_MANAGER',
  'TEAM_MANAGER',
  'ADMIN',
  'SUPER_ADMIN',
]
