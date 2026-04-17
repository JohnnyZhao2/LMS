import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronLeft, LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/stores/auth-context'
import { AvatarPickerPopover } from '@/features/users/components/avatar-picker-popover'
import { type MenuItem, useRoleMenu } from '@/hooks/use-role-menu'
import { RoleIndicatorDot } from '@/components/layouts/workspace-user-controls'
import { useWorkspaceUserControls } from '@/components/layouts/use-workspace-user-controls'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/config/routes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollContainer } from '@/components/ui/scroll-container'
import { BrandMark } from '@/components/layouts/brand-mark'

interface SidebarProps {
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
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

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  const handleNavClick = (path: string) => {
    navigate(path)
    onClose?.()
  }

  const isMenuItemActive = React.useCallback(function checkMenuItemActive(item: MenuItem): boolean {
    if (item.children?.length) {
      return item.children.some((child) => checkMenuItemActive(child))
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

  const selectedNavKey = getSelectedNavKey()

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
        isActive ? 'text-black' : 'text-text-muted'
      ),
    })
  }

  const navItemClassName = (isActive: boolean, destructive = false) => cn(
    'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors',
    destructive
      ? 'text-destructive hover:bg-muted'
      : isActive
        ? 'bg-muted text-black'
        : 'text-text-muted hover:bg-muted'
  )

  const labelClassName = (isActive: boolean, destructive = false) => cn(
    'min-w-0 flex-1 truncate text-[15px] leading-[22px] tracking-[-0.02em]',
    destructive
      ? 'text-destructive'
      : isActive
        ? 'font-semibold text-black'
        : 'font-medium text-text-muted'
  )

  const renderSubMenuTree = (
    items: { key?: string; label: string; isActive: boolean; onClick: () => void }[]
  ) => (
    <div className="relative ml-[26px] space-y-0.5 pt-1.5">
      <div className="absolute left-0 top-[10px] bottom-[22px] w-[1.5px] bg-border" />
      {items.map((child) => (
        <button
          key={child.key ?? child.label}
          type="button"
          onClick={child.onClick}
          className={cn(
            'group relative ml-[14px] flex h-10 w-[calc(100%-14px)] items-center rounded-lg px-3 text-left transition-colors',
            child.isActive
              ? 'bg-muted text-black'
              : 'text-text-muted hover:bg-muted'
          )}
        >
          <span className="absolute -left-[14px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-bl-[10px] border-b-[1.5px] border-l-[1.5px] border-border" />
          <span className={cn(
            'min-w-0 flex-1 truncate text-[13px] tracking-[-0.02em]',
            child.isActive ? 'font-semibold text-black' : 'font-medium text-text-muted'
          )}>
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
            'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors',
            isActive
              ? 'text-black'
              : 'text-text-muted hover:bg-muted'
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
              isActive ? 'text-black' : 'text-text-muted'
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
            className="absolute right-[-15px] top-8 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-muted bg-white text-black transition-colors hover:bg-muted"
            aria-label="关闭侧边栏"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
        )}

        <div className="flex h-full min-h-0 flex-col">
          <BrandMark />

          <ScrollContainer as="nav" className="mt-8 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <section className="space-y-1">
                <div className="space-y-1">
                  {menuItems.map((item) => renderWorkspaceItem(item))}
                </div>
              </section>
            </div>
          </ScrollContainer>
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <AvatarPickerPopover
                avatarKey={user?.avatar_key}
                name={userLabel || userInitials}
                size="lg"
                canEdit={!!user}
                isUpdating={isUpdatingAvatar}
                align="start"
                onSelectAvatar={handleMyAvatarSelect}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium leading-5 text-black">
                  {userLabel || 'LMS 用户'}
                </div>
                {roleOptions.length > 1 && currentRole ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-[12px] font-medium leading-4 text-text-muted outline-none transition-colors hover:bg-muted"
                        aria-label="切换角色"
                      >
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                        <span className="truncate">{roleLabel}</span>
                        <RoleIndicatorDot role={currentRole} size="md" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={6}
                      className="min-w-[132px] rounded-lg border border-border bg-white p-1 shadow-sm"
                    >
                      {roleOptions.map((option) => {
                        const isActive = option.value === currentRole

                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => handleRoleChange(option.value)}
                            className={cn(
                              'mb-1 cursor-pointer rounded-lg px-2.5 py-1.5 text-[13px] text-text-muted focus:bg-muted focus:text-black last:mb-0',
                              isActive && 'bg-muted text-black'
                            )}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-medium leading-4 text-text-muted">
                    <span className="truncate">{roleLabel}</span>
                    <RoleIndicatorDot role={currentRole} size="md" />
                  </div>
                )}
              </div>
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="退出登录"
                  title="退出登录"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive-50"
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
