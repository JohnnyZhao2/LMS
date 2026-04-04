import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, ChevronDown, Menu, X } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { AvatarPickerPopover } from '@/features/users/components/avatar-picker-popover'
import { useUpdateMyAvatar } from '@/features/users/api/manage-users'
import { type MenuItem, useRoleMenu } from '@/hooks/use-role-menu'
import { useCurrentRole } from '@/hooks/use-current-role'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/config/routes'
import { showApiError } from '@/utils/error-handler'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_FULL_LABELS, ROLE_INDICATOR_CLASSES, ROLE_ORDER } from '@/config/role-constants'
import type { RoleCode } from '@/types/api'
import { toast } from 'sonner'
import { GlobalBreadcrumb } from './global-breadcrumb'

interface StudentLayoutProps {
  children: React.ReactNode
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const { user, availableRoles, logout, switchRole, refreshUser } = useAuth()
  const currentRole = useCurrentRole()
  const updateMyAvatar = useUpdateMyAvatar()
  const navigate = useNavigate()
  const location = useLocation()
  const menuItems = useRoleMenu(currentRole)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  const isMenuItemActive = React.useCallback(function checkActive(item: MenuItem): boolean {
    if (item.children?.length) return item.children.some((c) => checkActive(c))
    if (!item.key) return false
    const [path, search = ''] = item.key.split('?')
    if (location.pathname !== path) return false
    return !search || location.search.replace(/^\?/, '') === search
  }, [location.pathname, location.search])

  const handleNavClick = (path: string) => {
    navigate(path)
    setMobileOpen(false)
  }

  const handleRoleChange = async (roleCode: RoleCode) => {
    if (roleCode === currentRole) return
    try {
      await switchRole(roleCode)
      const pathParts = location.pathname.split('/').filter(Boolean)
      const currentPath = pathParts.length <= 1 ? 'dashboard' : pathParts.slice(1).join('/')
      navigate(`/${roleCode.toLowerCase()}/${currentPath}${location.search}${location.hash}`)
    } catch (error) {
      showApiError(error, '角色切换失败')
    }
  }

  const handleMyAvatarSelect = async (avatarKey: string) => {
    try {
      await updateMyAvatar.mutateAsync({ avatar_key: avatarKey })
      await refreshUser()
      toast.success('头像已更新')
    } catch (error) {
      showApiError(error, '头像更新失败')
    }
  }

  const roleLabel = currentRole ? (ROLE_FULL_LABELS[currentRole] || '未知角色') : '未登录'
  const userLabel = user?.username || ''
  const userInitials = React.useMemo(() => {
    const source = (user?.username || roleLabel || 'L').trim()
    return source.slice(0, 2).toUpperCase()
  }, [roleLabel, user?.username])
  const indicatorClasses = currentRole
    ? ROLE_INDICATOR_CLASSES[currentRole]
    : { bar: 'bg-slate-400', glow: 'bg-slate-400/70' }
  const roleOptions = [...availableRoles]
    .sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))
    .map((r) => ({ label: ROLE_FULL_LABELS[r.code] || r.name, value: r.code }))

  const RoleIndicator = () => (
    <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
      <span className={cn('absolute h-1.5 w-1.5 rounded-full blur-[2px] animate-pulse', indicatorClasses.glow)} />
      <span className={cn('relative h-1.5 w-1.5 rounded-full', indicatorClasses.bar)} />
    </span>
  )

  const renderNavItem = (item: MenuItem) => {
    const isActive = isMenuItemActive(item)
    if (!item.children?.length) {
      return (
        <button
          key={item.key ?? item.label}
          type="button"
          onClick={() => item.key && handleNavClick(item.key)}
          className={cn(
            'relative flex items-center px-3 py-1.5 text-[14px] font-medium rounded-lg transition-colors whitespace-nowrap',
            isActive ? 'text-black bg-black/5' : 'text-text-muted hover:text-black hover:bg-black/5'
          )}
        >
          {item.label}
          {isActive && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-black rounded-full" />}
        </button>
      )
    }
    return (
      <DropdownMenu key={item.key ?? item.label}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-[14px] font-medium rounded-lg transition-colors whitespace-nowrap',
              isActive ? 'text-black bg-black/5' : 'text-text-muted hover:text-black hover:bg-black/5'
            )}
          >
            {item.label}
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px] rounded-xl border border-border bg-white p-1 shadow-sm">
          {item.children.map((child) => (
            <DropdownMenuItem
              key={child.key ?? child.label}
              onClick={() => child.key && handleNavClick(child.key)}
              className={cn(
                'cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] text-text-muted focus:bg-muted focus:text-black mb-1 last:mb-0',
                isMenuItemActive(child) && 'bg-muted text-black'
              )}
            >
              {child.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden flex-col bg-[#F6F8FC]">
      <header className="sticky top-0 z-30 h-14 border-b border-border/60 bg-white/90 backdrop-blur-md">
        <div className="flex h-full items-center gap-4 px-5 md:px-8">
          <img src="/logo.svg" alt="OPWiki" className="h-8 shrink-0 object-contain" />

          <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {menuItems.map((item) => renderNavItem(item))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2.5">
              <AvatarPickerPopover
                avatarKey={user?.avatar_key}
                name={userLabel || userInitials}
                size="sm"
                canEdit={!!user}
                isUpdating={updateMyAvatar.isPending}
                align="end"
                onSelectAvatar={handleMyAvatarSelect}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium text-black leading-4 truncate max-w-[100px]">{userLabel || 'LMS 用户'}</span>
                {availableRoles.length > 1 && currentRole ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-black transition-colors outline-none mt-0.5">
                        <span className="truncate">{roleLabel}</span>
                        <RoleIndicator />
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="min-w-[132px] rounded-xl border border-border bg-white p-1 shadow-sm">
                      {roleOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => handleRoleChange(option.value)}
                          className={cn(
                            'cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] text-text-muted focus:bg-muted focus:text-black mb-1 last:mb-0',
                            option.value === currentRole && 'bg-muted text-black'
                          )}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
                    <span>{roleLabel}</span>
                    <RoleIndicator />
                  </span>
                )}
              </div>
            </div>

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="退出登录"
                title="退出登录"
                className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background text-text-muted"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="菜单"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border/60 bg-white px-4 py-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = isMenuItemActive(item)
              if (item.children?.length) {
                return (
                  <div key={item.key ?? item.label}>
                    <div className="px-3 py-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">{item.label}</div>
                    {item.children.map((child) => (
                      <button
                        key={child.key ?? child.label}
                        type="button"
                        onClick={() => child.key && handleNavClick(child.key)}
                        className={cn(
                          'w-full text-left px-5 py-2 text-[14px] rounded-lg transition-colors',
                          isMenuItemActive(child) ? 'bg-muted text-black font-medium' : 'text-text-muted hover:bg-muted'
                        )}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )
              }
              return (
                <button
                  key={item.key ?? item.label}
                  type="button"
                  onClick={() => item.key && handleNavClick(item.key)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-[14px] rounded-lg transition-colors',
                    isActive ? 'bg-muted text-black font-medium' : 'text-text-muted hover:bg-muted'
                  )}
                >
                  {item.label}
                </button>
              )
            })}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AvatarPickerPopover
                  avatarKey={user?.avatar_key}
                  name={userLabel || userInitials}
                  size="sm"
                  canEdit={!!user}
                  isUpdating={updateMyAvatar.isPending}
                  align="start"
                  onSelectAvatar={handleMyAvatarSelect}
                />
                <span className="text-[13px] font-medium text-black">{userLabel || 'LMS 用户'}</span>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive-50"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
        <div className="flex h-full w-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden px-5 py-6 md:px-8 xl:px-10">
          <GlobalBreadcrumb />
          <div className="scrollbar-subtle -mx-8 -mt-4 flex min-h-0 flex-1 flex-col overflow-auto px-8 pt-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
