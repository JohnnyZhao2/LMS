/**
 * 角色配置 - 统一管理角色颜色和图标配置
 */
import type { RoleCode } from '@/types/common';

interface RoleVisualConfig {
  bar: string;
  glow: string;
  bgClass: string;
  textClass: string;
  mutedTextClass: string;
  borderClass?: string;
}

export const ROLE_VISUALS: Record<RoleCode, RoleVisualConfig> = {
  MENTOR: {
    bar: 'bg-emerald-400',
    glow: 'bg-emerald-400/80',
    bgClass: 'bg-emerald-100/70',
    textClass: 'text-emerald-700',
    mutedTextClass: 'text-emerald-500',
    borderClass: 'border-emerald-200',
  },
  DEPT_MANAGER: {
    bar: 'bg-violet-400',
    glow: 'bg-violet-400/80',
    bgClass: 'bg-violet-100/70',
    textClass: 'text-violet-700',
    mutedTextClass: 'text-violet-500',
    borderClass: 'border-violet-200',
  },
  ADMIN: {
    bar: 'bg-rose-400',
    glow: 'bg-rose-400/80',
    bgClass: 'bg-rose-100/70',
    textClass: 'text-rose-700',
    mutedTextClass: 'text-rose-500',
    borderClass: 'border-rose-200',
  },
};

export const LEARNING_WORKSPACE_VISUAL = {
  bar: 'bg-sky-400',
  glow: 'bg-sky-400/80',
  bgClass: 'bg-sky-100/70',
  textClass: 'text-sky-700',
  mutedTextClass: 'text-sky-500',
  borderClass: 'border-sky-200',
};

export const SUPERUSER_VISUAL = {
  bar: 'bg-red-500',
  glow: 'bg-red-500/80',
  bgClass: 'bg-red-100/70',
  textClass: 'text-red-700',
  mutedTextClass: 'text-red-500',
  borderClass: 'border-red-200',
};

export const getRoleColor = (code: string): RoleVisualConfig => {
  return ROLE_VISUALS[code as RoleCode] || LEARNING_WORKSPACE_VISUAL;
};
