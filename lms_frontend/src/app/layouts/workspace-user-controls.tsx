import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/lib/auth'
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

export const ImpersonationBanner: React.FC = () => {
  const { user, roles, isImpersonating, impersonator, stopImpersonation } = useAuth()
  const navigate = useNavigate()
  const [exiting, setExiting] = React.useState(false)

  if (!isImpersonating || !user) {
    return null
  }

  const activeRoles = roles.filter((role) => role.is_active !== false).map((role) => role.name)
  const roleSummary = activeRoles.length > 0 ? activeRoles.join(' / ') : '普通学员'

  const handleExit = async () => {
    if (exiting) return
    setExiting(true)
    try {
      await stopImpersonation()
      navigate(ROUTES.USERS)
    } finally {
      setExiting(false)
    }
  }

  return (
    <div
      role="status"
      className="z-40 flex shrink-0 items-center justify-between gap-3 border-b border-amber-400/25 bg-[#111827] px-4 py-2 text-[12.5px] text-slate-100 shadow-[0_6px_20px_rgba(15,23,42,0.14)] md:px-6"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span className="truncate">
          正在以
          <strong className="mx-1 font-semibold text-amber-300">
            {user.username}（{user.employee_id} · {roleSummary}）
          </strong>
          身份浏览
          <span className="ml-2 hidden text-slate-400 sm:inline">
            · 仅当前标签页生效{impersonator?.username ? ` · 超管 ${impersonator.username}` : ''}
          </span>
        </span>
      </div>
      <button
        type="button"
        disabled={exiting}
        onClick={() => void handleExit()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-400/15 px-3 py-1 text-[12px] font-medium text-amber-200 transition-colors hover:bg-amber-400/25 hover:text-white disabled:opacity-50"
      >
        <Undo2 className="h-3.5 w-3.5" />
        {exiting ? '正在返回...' : '退出扮演'}
      </button>
    </div>
  )
}
