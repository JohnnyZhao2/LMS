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
    <div className={cn("min-h-screen relative bg-gray-100 flex flex-col", themeClass)} style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* 扁平几何背景装饰 - 恢复原始层级 */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" aria-hidden="true" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" aria-hidden="true" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full pointer-events-none" aria-hidden="true" />

      {/* Header */}
      <Header />

      {/* Main content area */}
      <main
        className="pt-24 px-6 pb-12 mx-auto w-full flex-1 flex flex-col"
        style={{
          maxWidth: "var(--container-max-width, 1400px)"
        }}
      >
        {children}
      </main>
    </div>
  )
}
