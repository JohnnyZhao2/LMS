/**
 * 角色配置 - 统一管理角色颜色和图标配置
 */
import type { BuiltinRoleCode } from '@/types/common';

export const LEARNING_WORKSPACE_LABEL = '学员端';
export const MANAGE_WORKSPACE_LABEL = '管理端';

interface RoleVisualConfig {
  bar: string;
  glow: string;
  bgClass: string;
  textClass: string;
}

const ROLE_VISUALS: Record<BuiltinRoleCode, RoleVisualConfig> = {
  MENTOR: {
    bar: 'bg-emerald-400',
    glow: 'bg-emerald-400/80',
    bgClass: 'bg-emerald-100/70',
    textClass: 'text-emerald-700',
  },
  DEPT_MANAGER: {
    bar: 'bg-violet-400',
    glow: 'bg-violet-400/80',
    bgClass: 'bg-violet-100/70',
    textClass: 'text-violet-700',
  },
  ADMIN: {
    bar: 'bg-rose-400',
    glow: 'bg-rose-400/80',
    bgClass: 'bg-rose-100/70',
    textClass: 'text-rose-700',
  },
};

export const LEARNING_WORKSPACE_VISUAL: RoleVisualConfig = {
  bar: 'bg-sky-400',
  glow: 'bg-sky-400/80',
  bgClass: 'bg-sky-100/70',
  textClass: 'text-sky-700',
};

export const SUPERUSER_VISUAL: RoleVisualConfig = {
  bar: 'bg-red-500',
  glow: 'bg-red-500/80',
  bgClass: 'bg-red-100/70',
  textClass: 'text-red-700',
};

const CUSTOM_ROLE_VISUAL: RoleVisualConfig = {
  bar: 'bg-amber-400',
  glow: 'bg-amber-400/80',
  bgClass: 'bg-amber-100/70',
  textClass: 'text-amber-700',
};

export const getRoleColor = (code: string): RoleVisualConfig => {
  return ROLE_VISUALS[code as BuiltinRoleCode] || CUSTOM_ROLE_VISUAL;
};
