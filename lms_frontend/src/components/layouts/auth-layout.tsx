"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

/**
 * 认证页面布局组件 - 极致美学版
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  description,
  className,
}) => {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gray-100" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* 扁平几何背景装饰 */}
      <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-blue-600/5 rounded-full pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-emerald-500/5 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] px-6 py-12">
        {/* Logo 装饰 */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-lg bg-blue-600 flex items-center justify-center mb-6 group cursor-default transition-transform duration-200 hover:scale-110">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <div className="text-center">
            <h1 className="text-gray-900 text-3xl font-bold tracking-tight mb-2">SyncLearn</h1>
            <div className="h-1 w-12 bg-blue-600 mx-auto rounded-full" />
          </div>
        </div>

        {/* 认证卡片 */}
        <div
          className={cn(
            "bg-white rounded-lg p-10 md:p-12 border-2 border-gray-200",
            className
          )}
        >
          {/* 卡片头部 */}
          {(title || description) && (
            <div className="mb-10 text-left">
              {title && (
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-gray-600 font-medium leading-relaxed">{description}</p>
              )}
            </div>
          )}

          {/* 内容区域 */}
          <div>
            {children}
          </div>
        </div>

        {/* 底部版权/装饰 */}
        <p className="mt-12 text-center text-gray-500 text-xs font-bold uppercase tracking-wider">
          &copy; 2024 SyncLearn Digital Academy
        </p>
      </div>
    </div>
  )
}
