"use client"

import * as React from "react"
import { Header } from "./header"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * 主应用布局组件 - 极致美学版
 * 包含：
 * 1. 动态渐变网孔背景 (bg-mesh)
 * 2. 玻璃拟态导航栏
 * 3. 页面淡入交互
 * 4. 角色主题切换 (Role-based Themes)
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { currentRole } = useAuth()

  // 根据角色映射主题类名
  const themeClass = React.useMemo(() => {
    switch (currentRole) {
      case 'MENTOR':
        return 'theme-mentor'
      case 'TEAM_MANAGER':
        return 'theme-manager'
      case 'ADMIN':
      default:
        return 'theme-default'
    }
  }, [currentRole])

  return (
    <div className={cn("min-h-screen relative selection:bg-primary-500/10 selection:text-primary-600", themeClass)}>
      {/* 动态渐变背景 */}
      <div className="bg-mesh" aria-hidden="true" />

      {/* 背景点状装饰 */}
      <div className="fixed inset-0 bg-dots opacity-[0.03] pointer-events-none" aria-hidden="true" />

      {/* Header */}
      <Header />

      {/* Main content area */}
      <main
        className="reveal-item pt-24 px-6 pb-12 mx-auto w-full transition-all duration-500"
        style={{
          maxWidth: "var(--container-max-width, 1400px)"
        }}
      >
        {children}
      </main>

      {/* 装饰性光晕 - 右下角 */}
      <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full pointer-events-none transition-colors duration-1000" />
      {/* 装饰性光晕 - 左中 */}
      <div className="fixed top-1/2 -left-32 w-80 h-80 bg-primary-500/5 blur-[100px] rounded-full pointer-events-none transition-colors duration-1000" />
    </div>
  )
}
