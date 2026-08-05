/**
 * 角色配置 - 统一管理角色颜色和图标配置
 */
import type { RoleCode } from '@/types/common';

interface RoleColorConfig {
  bgClass: string;
  textClass: string;
  mutedTextClass: string;
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
    bgClass: 'bg-sky-100/70',
    textClass: 'text-sky-700',
    mutedTextClass: 'text-sky-500',
    iconBgClass: 'bg-sky-500',
    borderClass: 'border-sky-200',
  },
  MENTOR: {
    bar: 'bg-emerald-400',
    glow: 'bg-emerald-400/80',
    bgClass: 'bg-emerald-100/70',
    textClass: 'text-emerald-700',
    mutedTextClass: 'text-emerald-500',
    iconBgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-200',
  },
  DEPT: {
    bar: 'bg-violet-400',
    glow: 'bg-violet-400/80',
    bgClass: 'bg-violet-100/70',
    textClass: 'text-violet-700',
    mutedTextClass: 'text-violet-500',
    iconBgClass: 'bg-violet-500',
    borderClass: 'border-violet-200',
  },
  GLOBAL: {
    bar: 'bg-rose-400',
    glow: 'bg-rose-400/80',
    bgClass: 'bg-rose-100/70',
    textClass: 'text-rose-700',
    mutedTextClass: 'text-rose-500',
    iconBgClass: 'bg-rose-500',
    borderClass: 'border-rose-200',
  },
  SUPER_ADMIN: {
    bar: 'bg-red-500',
    glow: 'bg-red-500/80',
    bgClass: 'bg-red-100/70',
    textClass: 'text-red-700',
    mutedTextClass: 'text-red-500',
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
  DEPT: ROLE_VISUALS.DEPT,
  GLOBAL: ROLE_VISUALS.GLOBAL,
  SUPER_ADMIN: ROLE_VISUALS.SUPER_ADMIN,
};

/**
 * 角色呼吸灯颜色映射（菜单栏）
 */
export const ROLE_INDICATOR_CLASSES: Record<RoleCode, { bar: string; glow: string }> = {
  STUDENT: { bar: ROLE_VISUALS.STUDENT.bar, glow: ROLE_VISUALS.STUDENT.glow },
  MENTOR: { bar: ROLE_VISUALS.MENTOR.bar, glow: ROLE_VISUALS.MENTOR.glow },
  DEPT: { bar: ROLE_VISUALS.DEPT.bar, glow: ROLE_VISUALS.DEPT.glow },
  GLOBAL: { bar: ROLE_VISUALS.GLOBAL.bar, glow: ROLE_VISUALS.GLOBAL.glow },
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
 * 可分配的角色列表（学员 + 三个授权角色）
 */
export const ASSIGNABLE_ROLES: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT', 'GLOBAL'];
