import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useRoleMenu } from "@/hooks/use-role-menu"
import { useCurrentRole } from "@/hooks/use-current-role"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/config/routes"
import { showApiError } from "@/utils/error-handler"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeSwitcher } from "@/components/theme-switcher"
import type { RoleCode } from "@/types/api"

// Minimal 线条图标 - 统一 1.5px 描边
const IconDashboard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
    <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
    <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
    <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
  </svg>
)

const IconKnowledge = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 16V4.5A1.5 1.5 0 0 1 4.5 3H16v14H4.5A1.5 1.5 0 0 1 3 15.5V16z" />
    <path d="M3 15.5A1.5 1.5 0 0 1 4.5 14H16" />
  </svg>
)

const IconTask = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <path d="M7 10l2 2 4-4" />
  </svg>
)

const IconUsers = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="6" r="2.5" />
    <path d="M2 17v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1" />
    <circle cx="14" cy="6" r="2" />
    <path d="M18 17v-.5a3 3 0 0 0-3-3" />
  </svg>
)

const IconQuiz = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="7" />
    <path d="M8 8a2 2 0 1 1 2.5 1.94c-.39.12-.5.44-.5.81V12" />
    <circle cx="10" cy="14" r="0.5" fill="currentColor" />
  </svg>
)

const IconSpotCheck = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z" />
    <path d="M12 2v5h5" />
    <circle cx="9" cy="12" r="2.5" />
    <path d="M11 14l2 2" />
  </svg>
)

const IconAnalytics = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 3v14h14" />
    <path d="M6 13l3-3 3 3 4-5" />
  </svg>
)

const IconPersonal = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="6" r="3" />
    <path d="M4 18v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
  </svg>
)

const IconBell = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 2a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 10V7a5 5 0 0 0-5-5z" />
    <path d="M8 14.5a2 2 0 0 0 4 0" />
  </svg>
)

const IconLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ROLE_SHORT_LABELS: Record<RoleCode, string> = {
  STUDENT: "学",
  MENTOR: "师",
  DEPT_MANAGER: "室",
  ADMIN: "管",
  TEAM_MANAGER: "团",
  SUPER_ADMIN: "超",
}

const ROLE_FULL_LABELS: Record<RoleCode, string> = {
  STUDENT: "学员",
  MENTOR: "导师",
  DEPT_MANAGER: "室经理",
  ADMIN: "管理员",
  TEAM_MANAGER: "团队经理",
  SUPER_ADMIN: "超管",
}

// 角色颜色 - 每个角色固定颜色，不随主题变化
const ROLE_COLOR_CLASSES: Record<RoleCode, string> = {
  STUDENT: "bg-sky-500",         // 天蓝
  MENTOR: "bg-emerald-500",      // 翠绿
  DEPT_MANAGER: "bg-violet-500", // 紫色
  TEAM_MANAGER: "bg-amber-500",  // 琥珀色
  ADMIN: "bg-rose-500",          // 玫红
  SUPER_ADMIN: "bg-red-600",     // 深红
}

const ROLE_ORDER: RoleCode[] = ["STUDENT", "MENTOR", "DEPT_MANAGER", "TEAM_MANAGER", "ADMIN", "SUPER_ADMIN"]

// 图标映射
const getMenuIcon = (path: string): React.ReactNode => {
  const pathParts = path.split('/').filter(Boolean)
  const actualPath = pathParts.length > 1 ? pathParts.slice(1).join('/') : pathParts[0]

  const iconMap: Record<string, React.ReactNode> = {
    'dashboard': <IconDashboard className="w-4 h-4" />,
    'knowledge': <IconKnowledge className="w-4 h-4" />,
    'tasks': <IconTask className="w-4 h-4" />,
    'users': <IconUsers className="w-4 h-4" />,
    'quiz-center': <IconQuiz className="w-4 h-4" />,
    'spot-checks': <IconSpotCheck className="w-4 h-4" />,
    'grading-center': <IconQuiz className="w-4 h-4" />,
    'authorization': <IconUsers className="w-4 h-4" />,
    'activity-logs/settings': <IconBell className="w-4 h-4" />,
    'analytics': <IconAnalytics className="w-4 h-4" />,
    'personal': <IconPersonal className="w-4 h-4" />,
  }

  return iconMap[actualPath] || <IconDashboard className="w-4 h-4" />
}

/**
 * 顶部导航栏组件 - 极致美学版
 */
export const Header: React.FC = () => {
  const { user, availableRoles, logout, isLoading, switchRole } = useAuth()
  const currentRole = useCurrentRole()
  const navigate = useNavigate()
  const location = useLocation()
  const menuItems = useRoleMenu(currentRole)

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  // 获取当前路径（不含角色前缀）
  const getPathWithoutRole = () => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    if (pathParts.length <= 1) return 'dashboard'
    // 跳过角色前缀
    return pathParts.slice(1).join('/')
  }

  const handleRoleChange = async (roleCode: RoleCode) => {
    if (roleCode === currentRole) {
      return
    }
    try {
      await switchRole(roleCode)
      // 直接更新 URL，保持当前路径、查询参数和锚点
      const currentPath = getPathWithoutRole()
      const suffix = `${location.search}${location.hash}`
      navigate(`/${roleCode.toLowerCase()}/${currentPath}${suffix}`)
    } catch (error) {
      showApiError(error, "角色切换失败")
    }
  }

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const getSelectedNavKey = () => {
    const pathname = location.pathname
    const matched = menuItems.find((item) => {
      const key = (item as { key?: string })?.key
      if (!key) return false
      return pathname === key || pathname.startsWith(key + "/")
    })
    return (matched as { key?: string })?.key || ""
  }

  const roleOptions = [...availableRoles]
    .sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))
    .map((role) => ({
      label: ROLE_SHORT_LABELS[role.code] || role.name.charAt(0),
      value: role.code,
    }))

  // 获取带角色前缀的 dashboard 路径
  const getDashboardPath = () => {
    if (currentRole) {
      return `/${currentRole.toLowerCase()}/dashboard`
    }
    return ROUTES.DASHBOARD
  }

  const selectedNavKey = getSelectedNavKey()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-6 bg-background border-b border-border">
      {/* 左侧：Logo + 导航菜单 */}
      <div className="flex items-center gap-10">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate(getDashboardPath())}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <IconLogo className="text-white w-5 h-5" />
          </div>
          <span className="text-[15px] font-semibold text-foreground">
            学习平台
          </span>
        </div>

        {/* 导航菜单 */}
        <nav className="hidden lg:flex items-center gap-1">
          {menuItems.length > 0 ? (
            menuItems.map((item) => {
              const menuItem = item as { key?: string; icon?: React.ReactNode; label?: React.ReactNode }
              if (!menuItem.key) return null

              const isActive = selectedNavKey === menuItem.key
              const icon = getMenuIcon(menuItem.key)

              return (
                <button
                  key={menuItem.key}
                  onClick={() => handleNavClick(menuItem.key!)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-text-muted hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/10 rounded-md -z-10" />
                  )}
                  <span className={cn(
                    "shrink-0",
                    isActive ? "text-primary" : "text-text-muted"
                  )}>
                    {icon}
                  </span>
                  <span>{menuItem.label}</span>
                </button>
              )
            })
          ) : isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex items-center gap-1.5 px-3 py-1.5"
              >
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-10 rounded" />
              </div>
            ))
          ) : null}
        </nav>
      </div>

      {/* 右侧：主题切换 + 通知 + 角色切换器 + 用户信息 */}
      <div className="flex items-center gap-1">
        {/* 主题切换 */}
        <ThemeSwitcher />

        {/* 通知 */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-foreground hover:bg-muted transition-colors">
          <IconBell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </button>

        {/* 角色切换器 */}
        {availableRoles.length > 1 && currentRole && (
          <div
            className="hidden md:flex items-center bg-muted p-0.5 rounded-md gap-0.5 ml-2"
          >
            {roleOptions.map((option) => {
              const pathRole = location.pathname.split('/')[1]?.toUpperCase() as RoleCode
              const isActive = pathRole === option.value || currentRole === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => handleRoleChange(option.value)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center text-xs font-medium rounded transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-text-muted hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}

        {/* 用户信息 */}
        {user && (
          <div className="ml-2 flex items-center gap-2">
            <button
              onClick={() => navigate(`/${currentRole!.toLowerCase()}/personal`)}
              className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted transition-colors"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className={cn(
                    "text-white text-xs font-medium",
                    ROLE_COLOR_CLASSES[currentRole!] || "bg-primary"
                  )}
                >
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground leading-tight">
                  {user.username}
                </span>
                <span className="text-[10px] text-text-muted leading-tight">
                  {ROLE_FULL_LABELS[currentRole!]}
                </span>
              </div>
            </button>
            <span className="hidden sm:block h-5 w-px bg-border" />
            <button
              onClick={handleLogout}
              aria-label="退出登录"
              title="退出登录"
              className="group inline-flex items-center justify-center p-1 text-destructive transition-all duration-200 hover:-translate-y-0.5 hover:opacity-80 active:translate-y-0"
            >
              <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:rotate-6 group-hover:scale-105" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
