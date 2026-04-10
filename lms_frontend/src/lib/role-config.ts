/**
 * 角色配置 - 统一管理角色颜色和图标配置
 */
import type { RoleCode } from '@/types/common';

interface RoleColorConfig {
  bgClass: string;
  textClass: string;
  iconBgClass?: string;
  borderClass?: string;
}

interface RoleVisualConfig extends RoleColorConfig {
  bar: string;
  glow: string;
}

const ROLE_VISUALS: Record<RoleCode, RoleVisualConfig> = {
  STUDENT: {
    bar: 'bg-sky-400',
    glow: 'bg-sky-400/80',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    iconBgClass: 'bg-sky-500',
    borderClass: 'border-sky-200',
  },
  MENTOR: {
    bar: 'bg-emerald-400',
    glow: 'bg-emerald-400/80',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    iconBgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-200',
  },
  DEPT_MANAGER: {
    bar: 'bg-violet-400',
    glow: 'bg-violet-400/80',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    iconBgClass: 'bg-violet-500',
    borderClass: 'border-violet-200',
  },
  TEAM_MANAGER: {
    bar: 'bg-amber-400',
    glow: 'bg-amber-400/80',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    iconBgClass: 'bg-amber-500',
    borderClass: 'border-amber-200',
  },
  ADMIN: {
    bar: 'bg-rose-400',
    glow: 'bg-rose-400/80',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    iconBgClass: 'bg-rose-500',
    borderClass: 'border-rose-200',
  },
  SUPER_ADMIN: {
    bar: 'bg-red-500',
    glow: 'bg-red-500/80',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    iconBgClass: 'bg-red-500',
    borderClass: 'border-red-200',
  },
};

/**
 * 角色颜色映射（用于标签显示）
 */
export const ROLE_COLORS: Record<RoleCode, RoleColorConfig> = {
  STUDENT: ROLE_VISUALS.STUDENT,
  MENTOR: ROLE_VISUALS.MENTOR,
  DEPT_MANAGER: ROLE_VISUALS.DEPT_MANAGER,
  TEAM_MANAGER: ROLE_VISUALS.TEAM_MANAGER,
  ADMIN: ROLE_VISUALS.ADMIN,
  SUPER_ADMIN: ROLE_VISUALS.SUPER_ADMIN,
};

/**
 * 角色呼吸灯颜色映射（菜单栏）
 */
export const ROLE_INDICATOR_CLASSES: Record<RoleCode, { bar: string; glow: string }> = {
  STUDENT: { bar: ROLE_VISUALS.STUDENT.bar, glow: ROLE_VISUALS.STUDENT.glow },
  MENTOR: { bar: ROLE_VISUALS.MENTOR.bar, glow: ROLE_VISUALS.MENTOR.glow },
  DEPT_MANAGER: { bar: ROLE_VISUALS.DEPT_MANAGER.bar, glow: ROLE_VISUALS.DEPT_MANAGER.glow },
  TEAM_MANAGER: { bar: ROLE_VISUALS.TEAM_MANAGER.bar, glow: ROLE_VISUALS.TEAM_MANAGER.glow },
  ADMIN: { bar: ROLE_VISUALS.ADMIN.bar, glow: ROLE_VISUALS.ADMIN.glow },
  SUPER_ADMIN: { bar: ROLE_VISUALS.SUPER_ADMIN.bar, glow: ROLE_VISUALS.SUPER_ADMIN.glow },
};

/**
 * 获取角色颜色配置
 */
export const getRoleColor = (code: string): RoleColorConfig => {
  const normalized = code as RoleCode;
  return ROLE_COLORS[normalized] || ROLE_COLORS.STUDENT;
};

/**
 * 可分配的角色列表（不含 STUDENT）
 */
export const ASSIGNABLE_ROLES: RoleCode[] = ['ADMIN', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER'];
