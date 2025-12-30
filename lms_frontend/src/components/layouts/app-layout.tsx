"use client"

import * as React from "react"
import { Header } from "./header"

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * 主应用布局组件
 * 包含顶部导航栏和主内容区域
 * 使用 Tailwind CSS 样式
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-gray-100)" }}
    >
      {/* Header */}
      <Header />
      
      {/* Main content area */}
      <main
        className="animate-fadeIn pt-16 px-6 pb-6 mx-auto w-full"
        style={{ 
          marginTop: "var(--header-height)",
          maxWidth: "var(--container-max-width, 1400px)" 
        }}
      >
        {children}
      </main>
    </div>
  )
}
