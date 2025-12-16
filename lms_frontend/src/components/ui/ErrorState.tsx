import * as React from "react"
import { cn } from "@/utils/cn"
import { AlertTriangle, RefreshCw, WifiOff, ShieldX, FileX } from "lucide-react"
import { Button } from "./Button"

export type ErrorStateVariant = 'default' | 'network' | 'permission' | 'notFound'

export interface ErrorStateProps {
    /** Error title */
    title?: string
    /** Error message/description */
    message?: string
    /** Error variant */
    variant?: ErrorStateVariant
    /** Custom icon */
    icon?: React.ReactNode
    /** Show retry button */
    showRetry?: boolean
    /** Retry button text */
    retryText?: string
    /** Retry callback */
    onRetry?: () => void
    /** Loading state for retry button */
    retrying?: boolean
    /** Additional class names */
    className?: string
    /** Children for custom content */
    children?: React.ReactNode
}

const variantConfig: Record<ErrorStateVariant, { icon: React.ReactNode; title: string; message: string }> = {
    default: {
        icon: <AlertTriangle className="h-12 w-12" />,
        title: "出错了",
        message: "操作失败，请稍后重试",
    },
    network: {
        icon: <WifiOff className="h-12 w-12" />,
        title: "网络连接失败",
        message: "请检查您的网络连接后重试",
    },
    permission: {
        icon: <ShieldX className="h-12 w-12" />,
        title: "无权访问",
        message: "您没有权限访问此内容",
    },
    notFound: {
        icon: <FileX className="h-12 w-12" />,
        title: "内容不存在",
        message: "您访问的内容不存在或已被删除",
    },
}

const ErrorState: React.FC<ErrorStateProps> = ({
    title,
    message,
    variant = 'default',
    icon,
    showRetry = true,
    retryText = "重试",
    onRetry,
    retrying = false,
    className,
    children,
}) => {
    const config = variantConfig[variant]
    const displayIcon = icon || config.icon
    const displayTitle = title || config.title
    const displayMessage = message || config.message

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-12 px-4 text-center",
                className
            )}
            role="alert"
        >
            <div className="text-status-error/70 mb-4">
                {displayIcon}
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">
                {displayTitle}
            </h3>
            <p className="text-sm text-text-muted max-w-sm mb-4">
                {displayMessage}
            </p>
            {children}
            {showRetry && onRetry && (
                <Button 
                    variant="secondary" 
                    onClick={onRetry} 
                    loading={retrying}
                    className="mt-2"
                >
                    <RefreshCw className={cn("h-4 w-4 mr-2", retrying && "animate-spin")} />
                    {retryText}
                </Button>
            )}
        </div>
    )
}
ErrorState.displayName = "ErrorState"

// Error Boundary Component
interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.props.onError?.(error, errorInfo)
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <ErrorState
                    title="页面出错了"
                    message={this.state.error?.message || "发生了未知错误"}
                    onRetry={this.handleRetry}
                />
            )
        }

        return this.props.children
    }
}

export { ErrorState, ErrorBoundary }
