import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUpdateMyAvatar } from '@/features/users/api/manage-users'
import { useAuth } from '@/features/auth/stores/auth-context'
import { useCurrentRole } from '@/hooks/use-current-role'
import { ROLE_FULL_LABELS, ROLE_INDICATOR_CLASSES, ROLE_ORDER } from '@/config/role-constants'
import { cn } from '@/lib/utils'
import { showApiError } from '@/utils/error-handler'
import type { RoleCode } from '@/types/api'
import { toast } from 'sonner'
import { getWorkspacePath, stripWorkspacePathPrefix } from '@/app/workspace-config'

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

export const useWorkspaceUserControls = () => {
  const { user, availableRoles, switchRole, refreshUser } = useAuth()
  const currentRole = useCurrentRole()
  const updateMyAvatar = useUpdateMyAvatar()
  const navigate = useNavigate()
  const location = useLocation()

  const handleRoleChange = React.useCallback(async (roleCode: RoleCode) => {
    if (roleCode === currentRole) {
      return
    }

    try {
      await switchRole(roleCode)
      const currentPath = stripWorkspacePathPrefix(location.pathname)
      const suffix = `${location.search}${location.hash}`
      navigate(`${getWorkspacePath(roleCode, currentPath) ?? '/'}${suffix}`)
    } catch (error) {
      showApiError(error, '角色切换失败')
    }
  }, [
    currentRole,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    switchRole,
  ])

  const handleMyAvatarSelect = React.useCallback(async (avatarKey: string) => {
    try {
      await updateMyAvatar.mutateAsync({ avatar_key: avatarKey })
      await refreshUser()
      toast.success('头像已更新')
    } catch (error) {
      showApiError(error, '头像更新失败')
    }
  }, [refreshUser, updateMyAvatar])

  const roleLabel = currentRole ? (ROLE_FULL_LABELS[currentRole] ?? '未知角色') : '未登录'
  const userLabel = user?.username || ''
  const userInitials = React.useMemo(() => {
    const source = (user?.username || roleLabel || 'L').trim()
    return source.slice(0, 2).toUpperCase()
  }, [roleLabel, user?.username])

  const roleOptions = React.useMemo(() => (
    [...availableRoles]
      .sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))
      .map((role) => ({
        label: ROLE_FULL_LABELS[role.code] ?? role.name,
        value: role.code,
      }))
  ), [availableRoles])

  return {
    currentRole,
    handleMyAvatarSelect,
    handleRoleChange,
    isUpdatingAvatar: updateMyAvatar.isPending,
    roleLabel,
    roleOptions,
    user,
    userInitials,
    userLabel,
  }
}
