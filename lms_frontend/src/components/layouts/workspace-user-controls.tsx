import * as React from 'react'
import { ROLE_INDICATOR_CLASSES } from '@/config/role-constants'
import { cn } from '@/lib/utils'
import type { RoleCode } from '@/types/common';

const FALLBACK_ROLE_INDICATOR_CLASSES = {
  bar: 'bg-slate-400',
  glow: 'bg-slate-400/70',
}

interface RoleIndicatorDotProps {
  role: RoleCode | null
  size?: 'sm' | 'md'
}

export const RoleIndicatorDot: React.FC<RoleIndicatorDotProps> = ({
  role,
  size = 'sm',
}) => {
  const indicatorClasses = role ? ROLE_INDICATOR_CLASSES[role] : FALLBACK_ROLE_INDICATOR_CLASSES
  const containerClassName = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5'
  const dotClassName = size === 'md' ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5'

  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', containerClassName)}>
      <span
        className={cn(
          'absolute rounded-full blur-[2px] animate-pulse',
          containerClassName,
          indicatorClasses.glow
        )}
      />
      <span className={cn('relative rounded-full', dotClassName, indicatorClasses.bar)} />
    </span>
  )
}
