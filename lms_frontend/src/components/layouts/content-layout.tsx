"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ContentLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * 内容布局组件 - 极致美学版
 * 提供沉浸式的页面头部和内容容器
 */
export const ContentLayout: React.FC<ContentLayoutProps> = ({
  children,
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={cn("space-y-10 reveal-item", className)}>
      {/* 增强型页面头部 */}
      {(title || description || actions) && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-gray-100/50">
          <div className="space-y-3">
            {title && (
              <h1 className="text-4xl font-black tracking-tight text-gray-900 font-display">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-base font-bold text-gray-400 uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-[2px] bg-primary-500/30 rounded-full" />
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-3 reveal-item stagger-delay-1">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* 页面内容主体 */}
      <div className="reveal-item stagger-delay-2">
        {children}
      </div>
    </div>
  )
}
