import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronLeft, LogOut, Settings, ShieldCheck, ScrollText } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
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
import { useTheme } from '@/lib/use-theme'
import {
  ROLE_FULL_LABELS,
  ROLE_INDICATOR_CLASSES,
  ROLE_ORDER,
} from '@/config/role-constants'
import type { RoleCode } from '@/types/api'

interface SidebarProps {
  onClose?: () => void
}

const ThemeSunIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="10" cy="10" r="3" />
    <path d="M10 2.8v2M10 15.2v2M2.8 10h2M15.2 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M4.8 15.2l1.4-1.4M13.8 6.2l1.4-1.4" />
  </svg>
)

const ThemeBookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 15.5V5a2 2 0 0 1 2-2h9v12.5H6a2 2 0 0 0-2 2Z" />
    <path d="M4 15.5A2 2 0 0 1 6 13.5h9" />
  </svg>
)

const ThemeLayersIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M10 3 3 6.8 10 10.5l7-3.7L10 3Z" />
    <path d="M3 10.6 10 14.3l7-3.7" />
    <path d="M3 14.2 10 17.9l7-3.7" />
  </svg>
)

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user, availableRoles, logout, switchRole, hasAnyPermission } = useAuth()
  const currentRole = useCurrentRole()
  const navigate = useNavigate()
  const location = useLocation()
  const menuItems = useRoleMenu(currentRole)
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  const getPathWithoutRole = () => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    if (pathParts.length <= 1) return 'dashboard'
    return pathParts.slice(1).join('/')
  }

  const handleRoleChange = async (roleCode: RoleCode) => {
    if (roleCode === currentRole) return
    try {
      await switchRole(roleCode)
      const currentPath = getPathWithoutRole()
      const suffix = `${location.search}${location.hash}`
      navigate(`/${roleCode.toLowerCase()}/${currentPath}${suffix}`)
    } catch (error) {
      showApiError(error, '角色切换失败')
    }
  }

  const handleNavClick = (path: string) => {
    navigate(path)
    onClose?.()
  }

  const rolePrefix = React.useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    if (pathParts.length > 0) {
      return `/${pathParts[0]}`
    }
    return currentRole ? `/${currentRole.toLowerCase()}` : ''
  }, [currentRole, location.pathname])

  const isMenuItemActive = React.useCallback((item: MenuItem): boolean => {
    if (item.children?.length) {
      return item.children.some((child) => isMenuItemActive(child))
    }

    if (!item.key) {
      return false
    }

    const [path, search = ''] = item.key.split('?')
    if (location.pathname !== path) {
      return false
    }

    if (!search) {
      return true
    }

    return location.search.replace(/^\?/, '') === search
  }, [location.pathname, location.search])

  const getSelectedNavKey = () => {
    const findActiveKey = (items: MenuItem[]): string => {
      for (const item of items) {
        if (item.children?.length) {
          const childKey = findActiveKey(item.children)
          if (childKey) {
            return childKey
          }
        }
        if (item.key && isMenuItemActive(item)) {
          return item.key
        }
      }
      return ''
    }

    return findActiveKey(menuItems)
  }

  const roleOptions = [...availableRoles]
    .sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))
    .map((role) => ({
      label: ROLE_FULL_LABELS[role.code] || role.name,
      value: role.code,
    }))

  const settingsItems = React.useMemo(() => {
    if (!rolePrefix) {
      return []
    }

    const items = []

    if (hasAnyPermission(['authorization.role_template.view', 'authorization.role_template.update'])) {
      items.push({
        key: 'role-template',
        label: '角色模板',
        path: `${rolePrefix}${ROUTES.AUTHORIZATION}`,
        icon: <ShieldCheck className="h-4 w-4" />,
        isActive: location.pathname === `${rolePrefix}${ROUTES.AUTHORIZATION}`,
      })
    }

    if (hasAnyPermission(['activity_log.policy.update'])) {
      items.push({
        key: 'log-policy',
        label: '日志策略',
        path: `${rolePrefix}${ROUTES.DASHBOARD}?settings=log-policy`,
        icon: <Settings className="h-4 w-4" />,
        isActive: location.pathname === `${rolePrefix}${ROUTES.DASHBOARD}` && new URLSearchParams(location.search).get('settings') === 'log-policy',
      })
    }

    if (hasAnyPermission(['activity_log.view'])) {
      items.push({
        key: 'audit-logs',
        label: '审计日志',
        path: `${rolePrefix}${ROUTES.DASHBOARD}?settings=audit-logs`,
        icon: <ScrollText className="h-4 w-4" />,
        isActive: location.pathname === `${rolePrefix}${ROUTES.DASHBOARD}` && new URLSearchParams(location.search).get('settings') === 'audit-logs',
      })
    }

    return items
  }, [hasAnyPermission, location.pathname, location.search, rolePrefix])

  const hasActiveSettingsItem = settingsItems.some((item) => item.isActive)
  const [isSettingsExpanded, setIsSettingsExpanded] = React.useState(hasActiveSettingsItem)

  React.useEffect(() => {
    if (hasActiveSettingsItem) {
      setIsSettingsExpanded(true)
    }
  }, [hasActiveSettingsItem])

  const selectedNavKey = getSelectedNavKey()
  const roleLabel = currentRole ? (ROLE_FULL_LABELS[currentRole] || '未知角色') : '未登录'
  const userLabel = user?.username || ''
  const userInitials = React.useMemo(() => {
    const source = (user?.username || roleLabel || 'L').trim()
    return source.slice(0, 2).toUpperCase()
  }, [roleLabel, user?.username])
  const indicatorClasses = currentRole
    ? ROLE_INDICATOR_CLASSES[currentRole]
    : { bar: 'bg-slate-400', glow: 'bg-slate-400/70' }
  const navSections = React.useMemo(() => {
    const profileItems = menuItems.filter((item) => item.key?.endsWith('/personal'))
    const workItems = menuItems.filter(
      (item) => !profileItems.some((profileItem) => profileItem.key === item.key)
    )

    return [
      { title: '工作台', items: workItems },
      { title: 'PERSONAL', items: profileItems },
    ].filter((section) => section.items.length > 0)
  }, [menuItems])

  const [expandedMenuKeys, setExpandedMenuKeys] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    setExpandedMenuKeys((current) => {
      const next = { ...current }
      menuItems.forEach((item) => {
        const key = item.key ?? item.label
        if (item.children?.length && isMenuItemActive(item) && next[key] !== true) {
          next[key] = true
        }
      })
      return next
    })
  }, [isMenuItemActive, menuItems])

  const renderMenuIcon = (icon: React.ReactNode, isActive: boolean) => {
    if (!React.isValidElement<{ className?: string }>(icon)) {
      return icon
    }

    return React.cloneElement(icon, {
      className: cn(
        'h-5 w-5',
        isActive ? 'text-black' : 'text-[#757575]'
      ),
    })
  }

  const navItemClassName = (isActive: boolean, destructive = false) => cn(
    'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors',
    destructive
      ? 'text-[#D55F5A] hover:bg-[#F6F6F6]'
      : isActive
        ? 'bg-[#F6F6F6] text-black'
        : 'text-[#757575] hover:bg-[#F6F6F6]'
  )

  const labelClassName = (isActive: boolean, destructive = false) => cn(
    'min-w-0 flex-1 truncate text-[15px] leading-[22px] tracking-[-0.02em]',
    destructive
      ? 'text-[#D55F5A]'
      : isActive
        ? 'font-medium text-black'
        : 'font-medium text-[#757575]'
  )

  const themeOptions = [
    { value: 'light' as const, icon: ThemeSunIcon, label: '明亮' },
    { value: 'scholar' as const, icon: ThemeBookIcon, label: '书院' },
    { value: 'dark' as const, icon: ThemeLayersIcon, label: '暗夜' },
  ]

  const renderSubMenuTree = (
    items: { key?: string; label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }[]
  ) => (
    <div className="relative ml-[26px] space-y-0.5 pt-1.5">
      <div className="absolute left-0 top-[10px] bottom-[22px] w-[1.5px] bg-[#E8E8E8]" />
      {items.map((child) => (
        <button
          key={child.key ?? child.label}
          type="button"
          onClick={child.onClick}
          className={cn(
            'group relative ml-[14px] flex h-10 w-[calc(100%-14px)] items-center gap-2.5 rounded-xl px-2.5 text-left transition-colors',
            child.isActive
              ? 'bg-[#F6F6F6] text-black'
              : 'text-[#757575] hover:bg-[#F6F6F6]'
          )}
        >
          <span className="absolute -left-[14px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-bl-[10px] border-b-[1.5px] border-l-[1.5px] border-[#E8E8E8]" />
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {renderMenuIcon(child.icon, child.isActive)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.02em]">
            {child.label}
          </span>
        </button>
      ))}
    </div>
  )

  const renderWorkspaceItem = (item: MenuItem) => {
    const itemIdentity = item.key ?? item.label
    const isActive = isMenuItemActive(item)

    if (!item.children?.length) {
      return (
        <button
          key={itemIdentity}
          type="button"
          onClick={() => item.key && handleNavClick(item.key)}
          className={navItemClassName(selectedNavKey === item.key)}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {renderMenuIcon(item.icon, isActive)}
          </span>
          <span className={labelClassName(isActive)}>
            {item.label}
          </span>
        </button>
      )
    }

    const isExpanded = expandedMenuKeys[itemIdentity] ?? isActive

    return (
      <div key={itemIdentity}>
        <button
          type="button"
          onClick={() => setExpandedMenuKeys((current) => ({
            ...current,
            [itemIdentity]: !isExpanded,
          }))}
          className={cn(
            'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors',
            isActive
              ? 'bg-[#F6F6F6] text-black'
              : 'text-[#757575] hover:bg-[#F6F6F6]'
          )}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {renderMenuIcon(item.icon, isActive)}
          </span>
          <span className={labelClassName(isActive)}>
            {item.label}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-300',
              isExpanded ? 'rotate-180' : '',
              isActive ? 'text-black' : 'text-[#757575]'
            )}
          />
        </button>

        <div
          className={cn(
            'grid transition-all duration-300 ease-out',
            isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            {renderSubMenuTree(
              (item.children ?? []).map((child) => ({
                key: child.key,
                label: child.label,
                icon: child.icon,
                isActive: isMenuItemActive(child),
                onClick: () => child.key && handleNavClick(child.key),
              }))
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside className="h-full w-[272px] shrink-0">
      <div className="relative flex h-full flex-col gap-5 overflow-hidden px-5 py-5">

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-[-15px] top-8 z-20 flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#F6F6F6] bg-white text-black transition-colors hover:bg-[#F6F6F6]"
            aria-label="关闭侧边栏"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
        )}

        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center gap-2 px-1">
            <img src="/logo.svg" alt="LMS" className="h-8 w-8 shrink-0 object-contain" />
            <span className="text-[20px] font-semibold tracking-[-0.03em] text-black">学习平台</span>
          </div>

          <div className="mt-5 h-[2px] rounded-full bg-[#F6F6F6]" />

          <nav className="mt-5 flex-1 overflow-y-auto scrollbar-subtle">
            <div className="space-y-4">
              {navSections.map((section) => (
                <section key={section.title} className="space-y-2">
                  <div className="px-3 text-[10px] font-medium uppercase leading-3 tracking-[0.18em] text-[#757575]">
                    {section.title}
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => renderWorkspaceItem(item))}
                  </div>
                </section>
              ))}

              {settingsItems.length > 0 && (
                <section className="space-y-2 pt-2">
                  <div className="px-3 text-[10px] font-medium uppercase leading-3 tracking-[0.18em] text-[#757575]">
                    设置
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsExpanded((current) => !current)}
                      className={cn(
                        'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors',
                        hasActiveSettingsItem
                          ? 'bg-[#F6F6F6] text-black'
                          : 'text-[#757575] hover:bg-[#F6F6F6]'
                      )}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {renderMenuIcon(<Settings className="h-5 w-5" />, hasActiveSettingsItem)}
                      </span>
                      <span className={labelClassName(hasActiveSettingsItem)}>
                        设置
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform duration-300',
                          isSettingsExpanded
                            ? `rotate-180 ${hasActiveSettingsItem ? 'text-black' : 'text-[#757575]'}`
                            : `${hasActiveSettingsItem ? 'text-black' : 'text-[#757575]'}`
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        'grid transition-all duration-300 ease-out',
                        isSettingsExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      )}
                    >
                      <div className="overflow-hidden">
                        {renderSubMenuTree(
                          settingsItems.map((item) => ({
                            key: item.key,
                            label: item.label,
                            icon: item.icon,
                            isActive: item.isActive,
                            onClick: () => handleNavClick(item.path),
                          }))
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </nav>

          <div className="mt-5 flex px-1">
            <div className="inline-flex items-center rounded-full bg-muted p-1">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isActive = theme === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-label={`切换到${option.label}主题`}
                    title={option.label}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-text-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 h-[2px] rounded-full bg-[#F6F6F6]" />

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#F4B2C2] to-[#FFD8E2] text-[16px] font-semibold text-black">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium leading-5 text-black">
                  {userLabel || 'LMS 用户'}
                </div>
                {availableRoles.length > 1 && currentRole ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-[12px] font-medium leading-4 text-[#757575] outline-none transition-colors hover:bg-[#F6F6F6]"
                        aria-label="切换角色"
                      >
                        <span className="truncate">{roleLabel}</span>
                        <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
                          <span className={cn('absolute h-2 w-2 rounded-full blur-[2px] animate-pulse', indicatorClasses.glow)} />
                          <span className={cn('relative h-1.5 w-1.5 rounded-full', indicatorClasses.bar)} />
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#757575]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={6}
                      className="min-w-[132px] rounded-xl border border-[#F0F0F0] bg-white p-1.5 shadow-sm"
                    >
                      {roleOptions.map((option) => {
                        const isActive = option.value === currentRole

                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => handleRoleChange(option.value)}
                            className={cn(
                              'cursor-pointer rounded-lg px-2.5 py-2 text-[13px] text-[#757575] focus:bg-[#F6F6F6] focus:text-black',
                              isActive && 'bg-[#F6F6F6] font-medium text-black'
                            )}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-medium leading-4 text-[#757575]">
                    <span className="truncate">{roleLabel}</span>
                    <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
                      <span className={cn('absolute h-2 w-2 rounded-full blur-[2px] animate-pulse', indicatorClasses.glow)} />
                      <span className={cn('relative h-1.5 w-1.5 rounded-full', indicatorClasses.bar)} />
                    </span>
                  </div>
                )}
              </div>
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="退出登录"
                  title="退出登录"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#D55F5A] transition-colors hover:bg-[#FCEAE9]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
