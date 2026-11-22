import * as React from 'react'
import { getRoleColor, LEARNING_WORKSPACE_VISUAL, SUPERUSER_VISUAL } from '@/lib/role-config'
import { cn } from '@/lib/utils'
import type { RoleCode, Workbench } from '@/types/common';

interface WorkspaceIndicatorDotProps {
  workbench: Workbench
  managementRole?: RoleCode | null
  isSuperuser?: boolean
  size?: 'sm' | 'md'
}

export const RoleIndicatorDot: React.FC<WorkspaceIndicatorDotProps> = ({
  workbench,
  managementRole = null,
  isSuperuser = false,
  size = 'sm',
}) => {
  const indicatorClasses = workbench === 'learn'
    ? LEARNING_WORKSPACE_VISUAL
    : isSuperuser
      ? SUPERUSER_VISUAL
      : getRoleColor(managementRole ?? '')
  const containerClassName = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5'
  const dotClassName = 'h-1.5 w-1.5'

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
