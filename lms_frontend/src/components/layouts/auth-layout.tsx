"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

/**
 * 认证页面布局组件
 * 用于登录、注册等认证相关页面
 * 保持与原 Ant Design 版本相同的视觉效果
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  description,
  className,
}) => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Auth card */}
      <div
        className={cn(
          "w-full max-w-[400px] rounded-lg bg-white p-8",
          className
        )}
        style={{
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Card header */}
        {(title || description) && (
          <div className="mb-8 text-center">
            {title && (
              <h1 className="text-[28px] font-semibold text-gray-900 m-0">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-2 text-gray-500">{description}</p>
            )}
          </div>
        )}

        {/* Card content */}
        {children}
      </div>
    </div>
  )
}
