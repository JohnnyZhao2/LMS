"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MainErrorFallbackProps {
  error: Error
  resetErrorBoundary?: () => void
}

/**
 * 主错误回退组件
 * 用于 Error Boundary 捕获错误时显示
 * 提供重试和返回首页选项
 */
export const MainErrorFallback: React.FC<MainErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const handleGoHome = () => {
    window.location.href = "/"
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 border-2 border-[#E5E7EB] text-center">
        {/* Error icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-50">
          <AlertTriangle className="h-8 w-8 text-error-500" />
        </div>

        {/* Error title */}
        <h1 className="mt-6 text-2xl font-semibold text-gray-900">
          出错了
        </h1>

        {/* Error message */}
        <p className="mt-2 text-sm text-gray-500">
          抱歉，页面发生了一些问题。请尝试刷新页面或返回首页。
        </p>

        {/* Error details (development only) */}
        {import.meta.env.DEV && error.message && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-left">
            <p className="text-xs font-medium text-gray-700">错误详情：</p>
            <p className="mt-1 text-xs text-gray-500 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {resetErrorBoundary && (
            <Button
              onClick={resetErrorBoundary}
              className="w-full sm:w-auto"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleGoHome}
            className="w-full sm:w-auto"
          >
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-gray-400">
        如果问题持续存在，请联系技术支持
      </p>
    </div>
  )
}
