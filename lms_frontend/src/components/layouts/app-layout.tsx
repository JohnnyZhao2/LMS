"use client"

import * as React from "react"

interface AppLayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
}

/**
 * 主应用布局组件
 * 包含顶部导航栏和主内容区域
 * 使用 Tailwind CSS 样式
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children, header }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header slot */}
      {header}
      
      {/* Main content area */}
      <main
        className="animate-fadeIn pt-16 px-6 pb-6 mx-auto w-full"
        style={{ maxWidth: "var(--container-max-width, 1440px)" }}
      >
        {children}
      </main>
    </div>
  )
}
