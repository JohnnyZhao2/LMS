import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut, User, ChevronDown, Bell } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutGrid,
  BookOpen,
  FileText,
  Users,
  HelpCircle,
  FileSearch,
  BarChart3,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useRoleMenu } from "@/hooks/use-role-menu"
import { useCurrentRole } from "@/hooks/use-current-role"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/config/routes"
import { showApiError } from "@/utils/error-handler"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeSwitcher } from "@/components/theme-switcher"
import type { RoleCode } from "@/types/api"

const ROLE_SHORT_LABELS: Record<RoleCode, string> = {
  STUDENT: "学",
  MENTOR: "师",
  DEPT_MANAGER: "室",
  ADMIN: "管",
  TEAM_MANAGER: "团",
}

const ROLE_FULL_LABELS: Record<RoleCode, string> = {
  STUDENT: "学员",
  MENTOR: "导师",
  DEPT_MANAGER: "室经理",
  ADMIN: "管理员",
  TEAM_MANAGER: "团队经理",
}

// 角色颜色 - 每个角色固定颜色，不随主题变化
const ROLE_COLOR_CLASSES: Record<RoleCode, string> = {
  STUDENT: "bg-sky-500",         // 天蓝
  MENTOR: "bg-emerald-500",      // 翠绿
  DEPT_MANAGER: "bg-violet-500", // 紫色
  TEAM_MANAGER: "bg-amber-500",  // 琥珀色
  ADMIN: "bg-rose-500",          // 玫红
}

const ROLE_ORDER: RoleCode[] = ["STUDENT", "MENTOR", "DEPT_MANAGER", "TEAM_MANAGER", "ADMIN"]

// 根据路径后缀获取图标
const getMenuIcon = (path: string): React.ReactNode => {
  // 移除角色前缀，获取实际路径
  const pathParts = path.split('/').filter(Boolean)
  const actualPath = pathParts.length > 1 ? pathParts.slice(1).join('/') : pathParts[0]

  const iconMap: Record<string, React.ReactNode> = {
    'dashboard': <LayoutGrid className="h-4 w-4" />,
    'knowledge': <BookOpen className="h-4 w-4" />,
    'tasks': <FileText className="h-4 w-4" />,
    'users': <Users className="h-4 w-4" />,
    'quiz-center': <HelpCircle className="h-4 w-4" />,
    'spot-checks': <FileSearch className="h-4 w-4" />,
    'analytics': <BarChart3 className="h-4 w-4" />,
    'personal': <User className="h-4 w-4" />,
  }

  return iconMap[actualPath] || <LayoutGrid className="h-4 w-4" />
}

/**
 * 顶部导航栏组件 - 极致美学版
 */
export const Header: React.FC = () => {
  const { user, availableRoles, logout, isLoading, switchRole, setIsSwitching, isSwitching } = useAuth()
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
      setIsSwitching(false)
    }
  }

  const prevPathRef = React.useRef(location.pathname)

  React.useEffect(() => {
    const prevPath = prevPathRef.current
    prevPathRef.current = location.pathname

    if (!isSwitching) {
      return
    }

    if (prevPath === location.pathname) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsSwitching(false)
    }, 400)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [location.pathname, isSwitching, setIsSwitching])

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
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-8 bg-background border-b-2 border-border transition-colors duration-200"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* 左侧：Logo + 品牌名 + 导航菜单 */}
      <div className="flex items-center gap-10">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate(getDashboardPath())}
        >
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <Sparkles className="text-white w-5 h-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight leading-none text-foreground">
              SyncLearn
            </span>
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase mt-0.5">
              Platform
            </span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="hidden lg:flex items-center gap-1 h-10 relative">
          <AnimatePresence mode="popLayout" initial={false}>
            {menuItems.length > 0 ? (
              menuItems.map((item) => {
                const menuItem = item as { key?: string; icon?: React.ReactNode; label?: React.ReactNode }
                if (!menuItem.key) return null

                const isActive = selectedNavKey === menuItem.key
                const icon = getMenuIcon(menuItem.key)

                return (
                  <motion.button
                    key={menuItem.key}
                    layout
                    onClick={() => handleNavClick(menuItem.key!)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 group",
                      isActive
                        ? "text-primary"
                        : "text-text-muted hover:text-foreground"
                    )}
                  >
                    {/* 活跃状态背景动画 */}
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-bg"
                        className="absolute inset-0 bg-primary-50 rounded-md -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}

                    <span className={cn(
                      "transition-transform duration-200 group-hover:scale-110 shrink-0",
                      isActive ? "text-primary" : "text-text-muted group-hover:text-primary"
                    )}>
                      {icon}
                    </span>
                    <span className="relative z-10">{menuItem.label}</span>
                  </motion.button>
                )
              })
            ) : isLoading ? (
              // 只有在真的没有数据且还在加载时才显示 Skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 w-12 rounded-sm" />
                </motion.div>
              ))
            ) : null}
          </AnimatePresence>
        </nav>
      </div>

      {/* 右侧：主题切换 + 通知 + 角色切换器 + 用户信息 */}
      <div className="flex items-center gap-4">
        {/* 主题切换 */}
        <ThemeSwitcher />

        {/* 通知图标 */}
        <button className="p-2.5 bg-muted rounded-md text-text-muted hover:text-primary hover:bg-primary-50 transition-all duration-200">
          <Bell className="w-5 h-5" />
        </button>

        {/* 角色切换器 */}
        {availableRoles.length > 1 && currentRole && (
          <div
            key={location.pathname} // 强制在路径变化时重新渲染
            className="hidden md:flex items-center bg-muted p-1 rounded-md gap-1"
          >
            {roleOptions.map((option) => {
              // 从当前 URL 实时解析角色，而不是依赖 state
              const pathRole = location.pathname.split('/')[1]?.toUpperCase() as RoleCode
              const isActive = pathRole === option.value || currentRole === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => handleRoleChange(option.value)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all duration-200",
                    isActive
                      ? "bg-background text-foreground"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 p-1 rounded-md hover:bg-muted transition-all duration-200 group"
              >
                <div className="relative">
                  <Avatar className="h-9 w-9 border-2 border-border transition-transform duration-200 group-hover:scale-105">
                    <AvatarFallback
                      className={cn(
                        "text-white font-bold text-sm",
                        ROLE_COLOR_CLASSES[currentRole!] || "bg-primary"
                      )}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                      ROLE_COLOR_CLASSES[currentRole!] || "bg-primary"
                    )}
                  />
                </div>

                <div className="hidden sm:flex flex-col items-start pr-2">
                  <span className="text-sm font-bold text-foreground leading-tight">
                    {user.username}
                  </span>
                  <span className="text-[10px] font-bold text-text-muted leading-tight uppercase tracking-wider">
                    {ROLE_FULL_LABELS[currentRole!]}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-text-muted group-hover:text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-lg border-2 border-border">
              <div className="px-3 py-3 border-b-2 border-border mb-1">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">当前角色</p>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", ROLE_COLOR_CLASSES[currentRole!] || "bg-primary")} />
                  <span className="text-sm font-bold text-foreground">{ROLE_FULL_LABELS[currentRole!]}</span>
                </div>
              </div>

              <DropdownMenuItem
                onClick={() => navigate(`/${currentRole!.toLowerCase()}/personal`)}
                className="rounded-md py-2.5 focus:bg-primary-50 focus:text-primary-600 cursor-pointer"
              >
                <User className="mr-3 h-4 w-4" />
                个人设置
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-md py-2.5 text-destructive-600 focus:text-destructive-700 focus:bg-destructive-50 cursor-pointer"
              >
                <LogOut className="mr-3 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
