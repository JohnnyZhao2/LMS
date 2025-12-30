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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gray-950 font-sans selection:bg-primary-500/20 selection:text-primary-400">
      {/* 动态背景几何体 */}
      <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-primary-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 背景点阵 */}
      <div className="absolute inset-0 bg-dots opacity-[0.15] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] px-6 py-12">
        {/* Logo 装饰 */}
        <div className="flex flex-col items-center mb-10 reveal-item">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-primary-500/30 mb-6 group cursor-default">
            <Sparkles className="text-white w-8 h-8 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="text-center">
            <h1 className="text-white text-3xl font-black tracking-tight mb-2">SyncLearn</h1>
            <div className="h-1 w-12 bg-primary-500 mx-auto rounded-full" />
          </div>
        </div>

        {/* 认证卡片 */}
        <div
          className={cn(
            "glass-card border border-white/10 rounded-[2.5rem] p-10 md:p-12 shadow-2xl reveal-item stagger-delay-1",
            className
          )}
        >
          {/* 卡片头部 */}
          {(title || description) && (
            <div className="mb-10 text-left">
              {title && (
                <h2 className="text-2xl font-black text-white tracking-tight mb-3">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-gray-400 font-medium leading-relaxed">{description}</p>
              )}
            </div>
          )}

          {/* 内容区域 */}
          <div className="reveal-item stagger-delay-2">
            {children}
          </div>
        </div>

        {/* 底部版权/装饰 */}
        <p className="mt-12 text-center text-gray-500 text-xs font-bold uppercase tracking-[0.2em] reveal-item stagger-delay-3">
          &copy; 2024 SyncLearn Digital Academy
        </p>
      </div>
    </div>
  )
}
