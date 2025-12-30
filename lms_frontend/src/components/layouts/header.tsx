"use client"

import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut, User } from "lucide-react"
import {
  LayoutGrid,
  BookOpen,
  FileText,
  CheckCircle,
  Users,
  HelpCircle,
  FileSearch,
  BarChart3,
} from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useRoleMenu } from "@/hooks/use-role-menu"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { RoleCode } from "@/types/api"

/**
 * 角色代码到简称的映射
 */
const ROLE_SHORT_LABELS: Record<RoleCode, string> = {
  STUDENT: "学",
  MENTOR: "师",
  DEPT_MANAGER: "室",
  ADMIN: "管",
  TEAM_MANAGER: "团",
}

/**
 * 角色代码到完整名称的映射
 */
const ROLE_FULL_LABELS: Record<RoleCode, string> = {
  STUDENT: "学员",
  MENTOR: "导师",
  DEPT_MANAGER: "室经理",
  ADMIN: "管理员",
  TEAM_MANAGER: "团队经理",
}

/**
 * 角色排序顺序：学员 -> 导师 -> 室经理 -> 团队经理 -> 管理员
 */
const ROLE_ORDER: RoleCode[] = ["STUDENT", "MENTOR", "DEPT_MANAGER", "TEAM_MANAGER", "ADMIN"]

/**
 * 菜单项图标映射 - 使用 Lucide 图标替换 Ant Design 图标
 */
const MENU_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": <LayoutGrid className="h-4 w-4" />,
  "/knowledge": <BookOpen className="h-4 w-4" />,
  "/admin/knowledge": <BookOpen className="h-4 w-4" />,
  "/tasks": <FileText className="h-4 w-4" />,
  "/grading": <CheckCircle className="h-4 w-4" />,
  "/users": <Users className="h-4 w-4" />,
  "/test-center": <HelpCircle className="h-4 w-4" />,
  "/spot-checks": <FileSearch className="h-4 w-4" />,
  "/analytics": <BarChart3 className="h-4 w-4" />,
  "/personal": <User className="h-4 w-4" />,
}

/**
 * 顶部导航栏组件
 * 包含 Logo、导航菜单、角色切换器和用户信息
 * 使用 Tailwind CSS 样式，保持与原 Ant Design 版本相同的视觉效果
 */
export const Header: React.FC = () => {
  const { user, currentRole, availableRoles, logout, switchRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const menuItems = useRoleMenu(currentRole)

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  /**
   * 处理角色切换
   */
  const handleRoleChange = async (roleCode: RoleCode) => {
    if (roleCode !== currentRole) {
      try {
        await switchRole(roleCode)
        navigate("/dashboard")
      } catch (error) {
        console.error("切换角色失败:", error)
      }
    }
  }

  /**
   * 处理导航菜单点击
   */
  const handleNavClick = (path: string) => {
    navigate(path)
  }

  /**
   * 获取当前选中的导航项
   */
  const getSelectedNavKey = () => {
    const pathname = location.pathname
    const matched = menuItems.find((item) => {
      const key = (item as { key?: string })?.key
      if (!key) return false
      return pathname === key || pathname.startsWith(key + "/")
    })
    return (matched as { key?: string })?.key || ""
  }

  // 角色分段选择器选项（按指定顺序排列）
  const roleOptions = [...availableRoles]
    .sort((a, b) => ROLE_ORDER.indexOf(a.code) - ROLE_ORDER.indexOf(b.code))
    .map((role) => ({
      label: ROLE_SHORT_LABELS[role.code] || role.name.charAt(0),
      value: role.code,
    }))

  const selectedNavKey = getSelectedNavKey()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-1000 flex items-center justify-between h-16 px-6"
      style={{
        background: "var(--color-gray-100)",
      }}
    >
      {/* 左侧：Logo + 品牌名 + 导航菜单 */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)",
              boxShadow: "var(--shadow-glow-primary)",
            }}
          >
            <span className="text-white text-sm font-bold">L</span>
          </div>

          <span
            className="text-lg font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--color-gray-900) 0%, var(--color-gray-700) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SyncLearn Pro
          </span>
        </div>

        {/* 导航菜单 */}
        <nav className="flex items-center gap-1">
          {menuItems.map((item) => {
            const menuItem = item as { key?: string; icon?: React.ReactNode; label?: React.ReactNode }
            if (!menuItem.key) return null

            const isActive = selectedNavKey === menuItem.key
            const icon = MENU_ICONS[menuItem.key]

            return (
              <button
                key={menuItem.key}
                onClick={() => handleNavClick(menuItem.key!)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 border-none rounded-lg text-sm font-medium cursor-pointer transition-all duration-150",
                  isActive
                    ? "bg-primary-500 text-white"
                    : "bg-transparent text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                )}
                style={{
                  fontFamily: "inherit",
                  background: isActive ? "var(--color-primary-500)" : undefined,
                }}
              >
                <span className="flex items-center">{icon}</span>
                <span>{menuItem.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* 右侧：角色切换器 + 用户信息 */}
      <div className="flex items-center gap-4">
        {/* 角色分段选择器 */}
        {availableRoles.length > 1 && currentRole && (
          <div
            className="flex items-center rounded-lg p-0.5"
            style={{
              background: "var(--color-white)",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            {roleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRoleChange(option.value)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 border-none cursor-pointer",
                  currentRole === option.value
                    ? "text-white"
                    : "bg-transparent text-gray-600 hover:bg-gray-50"
                )}
                style={{
                  background: currentRole === option.value ? "var(--color-primary-500)" : undefined,
                  fontFamily: "inherit",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* 用户信息 */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full cursor-pointer transition-all duration-150 border-none"
                style={{
                  background: "var(--color-white)",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                }}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback
                    className="text-white text-xs"
                    style={{
                      background: "linear-gradient(135deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%)",
                    }}
                  >
                    <User className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span
                    className="text-sm font-medium leading-tight"
                    style={{ color: "var(--color-gray-900)" }}
                  >
                    {user.username}
                  </span>
                  {currentRole && (
                    <span
                      className="text-[10px] leading-tight"
                      style={{ color: "var(--color-gray-500)" }}
                    >
                      {ROLE_FULL_LABELS[currentRole]}
                    </span>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500 focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
