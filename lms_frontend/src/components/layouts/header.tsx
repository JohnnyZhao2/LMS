"use client"

import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut, User, ChevronDown, Bell } from "lucide-react"
import {
  LayoutGrid,
  BookOpen,
  FileText,
  CheckCircle,
  Users,
  HelpCircle,
  FileSearch,
  BarChart3,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useRoleMenu } from "@/hooks/use-role-menu"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

const ROLE_COLORS: Record<RoleCode, string> = {
  STUDENT: "var(--color-primary-500)",
  MENTOR: "var(--color-success-500)",
  DEPT_MANAGER: "var(--color-purple-500)",
  TEAM_MANAGER: "var(--color-orange-500)",
  ADMIN: "var(--color-error-500)",
}

const ROLE_ORDER: RoleCode[] = ["STUDENT", "MENTOR", "DEPT_MANAGER", "TEAM_MANAGER", "ADMIN"]

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
 * 顶部导航栏组件 - 极致美学版
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

  const selectedNavKey = getSelectedNavKey()

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-8 glass-card border-none shadow-premium transition-all duration-300"
    >
      {/* 左侧：Logo + 品牌名 + 导航菜单 */}
      <div className="flex items-center gap-10">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("/dashboard")}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center relative shadow-lg group-hover:scale-110 transition-transform duration-300 ease-in-out"
            style={{
              background: "linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)",
            }}
          >
            <Sparkles className="text-white w-5 h-5" />
            <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
          </div>

          <div className="flex flex-col">
            <span
              className="text-lg font-bold tracking-tight leading-none"
              style={{
                background: "linear-gradient(135deg, var(--color-gray-900) 0%, var(--color-gray-700) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              SyncLearn
            </span>
            <span className="text-[10px] font-bold text-primary-500 tracking-[0.2em] uppercase mt-0.5">
              Platform
            </span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="hidden lg:flex items-center gap-2">
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
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 relative group",
                  isActive
                    ? "text-primary-600 bg-primary-50"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <span className={cn(
                  "transition-transform duration-300 group-hover:rotate-12",
                  isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"
                )}>
                  {icon}
                </span>
                <span>{menuItem.label}</span>
                {isActive && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* 右侧：通知 + 角色切换器 + 用户信息 */}
      <div className="flex items-center gap-6">
        {/* 通知图标 */}
        <button className="p-2.5 bg-gray-100 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all">
          <Bell className="w-5 h-5" />
        </button>

        {/* 角色切换器 */}
        {availableRoles.length > 1 && currentRole && (
          <div
            className="hidden md:flex items-center bg-gray-100/50 p-1 rounded-xl gap-1"
          >
            {roleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRoleChange(option.value)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
                  currentRole === option.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
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
                className="flex items-center gap-3 p-1 rounded-2xl hover:bg-gray-100 transition-all group"
              >
                <div className="relative">
                  <Avatar className="h-9 w-9 border-2 border-white shadow-md transition-transform group-hover:scale-105">
                    <AvatarFallback
                      className="text-white font-bold text-sm"
                      style={{
                        background: `linear-gradient(135deg, ${ROLE_COLORS[currentRole!] || 'var(--color-primary-500)'} 0%, var(--color-gray-900) 100%)`,
                      }}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                    style={{ background: ROLE_COLORS[currentRole!] || 'var(--color-primary-500)' }}
                  />
                </div>

                <div className="hidden sm:flex flex-col items-start pr-2">
                  <span className="text-sm font-bold text-gray-900 leading-tight">
                    {user.username}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 leading-tight uppercase tracking-wider">
                    {ROLE_FULL_LABELS[currentRole!]}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl">
              <div className="px-3 py-3 border-b border-gray-100 mb-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">当前角色</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: ROLE_COLORS[currentRole!] }}
                  />
                  <span className="text-sm font-bold text-gray-900">{ROLE_FULL_LABELS[currentRole!]}</span>
                </div>
              </div>

              <DropdownMenuItem
                onClick={() => navigate("/personal")}
                className="rounded-xl py-2.5 focus:bg-primary-50 focus:text-primary-600 cursor-pointer"
              >
                <User className="mr-3 h-4 w-4" />
                个人设置
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gray-100" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl py-2.5 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
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
