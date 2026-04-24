import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, ChevronDown, KeyRound, Menu, X } from 'lucide-react'
import { useAuth } from '@/session/auth/auth-context'
import { AvatarPickerPopover } from '@/entities/user/components/avatar-picker-popover'
import { type MenuItem, useRoleMenu } from '@/app/navigation/use-role-menu'
import { RoleIndicatorDot } from '@/app/layouts/workspace-user-controls'
import { useWorkspaceUserControls } from '@/app/layouts/use-workspace-user-controls'
import { ChangeOwnPasswordDialog } from '@/features/auth/components/change-own-password-dialog'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/config/routes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BrandMark } from '@/app/layouts/brand-mark'

interface StudentLayoutProps {
  children: React.ReactNode
}

const STUDENT_FRAME_CLASS = 'mx-auto w-full max-w-[1680px] px-6 md:px-8 xl:px-10'

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const { logout } = useAuth()
  const {
    currentRole,
    handleMyAvatarSelect,
    handleRoleChange,
    isUpdatingAvatar,
    roleLabel,
    roleOptions,
    user,
    userInitials,
    userLabel,
  } = useWorkspaceUserControls()
  const navigate = useNavigate()
  const location = useLocation()
  const menuItems = useRoleMenu(currentRole)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)

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

  const renderNavItem = (item: MenuItem) => {
    const isActive = isMenuItemActive(item)
    if (!item.children?.length) {
      return (
        <button
          key={item.key ?? item.label}
          type="button"
          onClick={() => item.key && handleNavClick(item.key)}
          className={cn(
            'relative inline-flex h-14 items-center px-2.5 text-[14px] font-medium tracking-[-0.015em] transition-colors whitespace-nowrap',
            isActive ? 'text-black' : 'text-text-muted hover:text-black'
          )}
        >
          {item.label}
          {isActive && <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full bg-black" />}
        </button>
      )
    }
    return (
      <DropdownMenu key={item.key ?? item.label} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-14 items-center gap-1 px-2.5 text-[14px] font-medium tracking-[-0.015em] transition-colors whitespace-nowrap',
              isActive ? 'text-black' : 'text-text-muted hover:text-black'
            )}
          >
            {item.label}
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px] rounded-lg border border-border bg-white p-1 shadow-sm">
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
    <div className="flex min-h-dvh flex-col bg-[#F6F8FC]">
      <header className="sticky top-0 z-30 h-14 shrink-0 bg-[#F6F8FC]/92 backdrop-blur-xl supports-[backdrop-filter]:bg-[#F6F8FC]/78">
        <div className={cn(
          STUDENT_FRAME_CLASS,
          'grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4'
        )}>
          <BrandMark />

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 px-4 md:flex xl:gap-2">
            {menuItems.map((item) => renderNavItem(item))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <AvatarPickerPopover
                avatarKey={user?.avatar_key}
                name={userLabel || userInitials}
                size="sm"
                canEdit={!!user}
                isUpdating={isUpdatingAvatar}
                align="end"
                className="ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                onSelectAvatar={handleMyAvatarSelect}
              />
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[13px] text-black/88 transition-colors outline-none hover:bg-black/[0.04]"
                  >
                    <span className="max-w-[96px] truncate font-medium">{userLabel || 'LMS 用户'}</span>
                    {currentRole && <RoleIndicatorDot role={currentRole} />}
                    <ChevronDown className="h-3 w-3 shrink-0 text-black/40" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-[188px] rounded-[14px] border border-black/[0.06] bg-white/96 p-1.5 shadow-[0_14px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl"
                >
                  {currentRole && (
                    <>
                      <div className="rounded-[10px] px-3 pb-1 pt-2">
                        <div className="text-[11px] text-text-muted">当前身份</div>
                        <div className="mt-1 inline-flex items-center gap-2 text-[13px] font-medium text-black">
                          <RoleIndicatorDot role={currentRole} />
                          <span>{roleLabel}</span>
                        </div>
                      </div>
                    </>
                  )}
                  {roleOptions.filter((option) => option.value !== currentRole).length > 0 && (
                    <div className="space-y-1">
                      {roleOptions
                        .filter((option) => option.value !== currentRole)
                        .map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => handleRoleChange(option.value)}
                          className={cn(
                            'mb-1 rounded-[10px] px-3 py-2 text-[13px] text-text-muted last:mb-0 focus:bg-black/[0.04] focus:text-black',
                            option.value === currentRole && 'bg-black/[0.04] text-black'
                          )}
                        >
                          <RoleIndicatorDot role={option.value} />
                          {option.label}
                        </DropdownMenuItem>
                        ))}
                    </div>
                  )}
                  <DropdownMenuSeparator className="my-1.5 h-px bg-black/[0.06]" />
                  <DropdownMenuItem
                    onClick={() => setPasswordDialogOpen(true)}
                    className="rounded-[10px] px-3 py-2 text-[13px] text-text-muted focus:bg-black/[0.04] focus:text-black"
                  >
                    <KeyRound className="h-4 w-4" />
                    修改密码
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void handleLogout()}
                    className="mt-1 rounded-[10px] px-3 py-2 text-destructive focus:bg-destructive/8 focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button
              type="button"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-text-muted"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="菜单"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-[#F6F8FC]/96 px-4 py-3 space-y-1 backdrop-blur-xl supports-[backdrop-filter]:bg-[#F6F8FC]/84">
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
                  isUpdating={isUpdatingAvatar}
                  align="start"
                  onSelectAvatar={handleMyAvatarSelect}
                />
                <span className="text-[13px] font-medium text-black">{userLabel || 'LMS 用户'}</span>
              </div>
              {user && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPasswordDialogOpen(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-muted hover:text-black"
                    aria-label="修改密码"
                    title="修改密码"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-destructive hover:bg-destructive-50"
                    aria-label="退出登录"
                    title="退出登录"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className={cn(
          STUDENT_FRAME_CLASS,
          'flex w-full min-w-0 flex-1 flex-col py-6'
        )}>
          <div className="-mt-4 flex w-full flex-col pt-4">
            {children}
          </div>
        </div>
      </main>
      <ChangeOwnPasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  )
}
