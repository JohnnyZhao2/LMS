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
 * 内容布局组件
 * 用于页面内容区域，包含可选的标题、描述和操作按钮
 */
export const ContentLayout: React.FC<ContentLayoutProps> = ({
  children,
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Page header */}
      {(title || description || actions) && (
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Page content */}
      <div>{children}</div>
    </div>
  )
}
