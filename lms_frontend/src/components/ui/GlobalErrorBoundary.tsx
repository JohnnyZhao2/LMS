/**
 * Global Error Boundary Component
 * Catches unhandled errors and displays a friendly error page
 * Requirements: 23.3 - Show clear error messages for failures
 */

import * as React from "react"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import { Button } from "./Button"

export interface GlobalErrorBoundaryProps {
    children: React.ReactNode
    /** Custom fallback component */
    fallback?: React.ReactNode
    /** Callback when error is caught */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
    /** Whether to show error details (for development) */
    showDetails?: boolean
}

interface GlobalErrorBoundaryState {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

/**
 * Global Error Boundary
 * Wraps the entire application to catch unhandled errors
 */
class GlobalErrorBoundary extends React.Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
    constructor(props: GlobalErrorBoundaryProps) {
        super(props)
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null 
        }
    }

    static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo })
        
        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo)
        
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('GlobalErrorBoundary caught an error:', error)
            console.error('Component stack:', errorInfo.componentStack)
        }
        
        // TODO: In production, send error to error tracking service (e.g., Sentry)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    handleGoHome = () => {
        window.location.href = '/'
    }

    handleReload = () => {
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default error page
            return (
                <GlobalErrorPage
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    showDetails={this.props.showDetails ?? process.env.NODE_ENV === 'development'}
                    onGoHome={this.handleGoHome}
                    onReload={this.handleReload}
                />
            )
        }

        return this.props.children
    }
}

/**
 * Global Error Page Component
 * Displays a friendly error page with recovery options
 */
interface GlobalErrorPageProps {
    error: Error | null
    errorInfo: React.ErrorInfo | null
    showDetails?: boolean
    onGoHome?: () => void
    onReload?: () => void
}

const GlobalErrorPage: React.FC<GlobalErrorPageProps> = ({
    error,
    errorInfo,
    showDetails = false,
    onGoHome,
    onReload,
}) => {
    const [showStack, setShowStack] = React.useState(false)

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center">
                {/* Error Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="p-4 rounded-full bg-status-error/10">
                        <AlertTriangle className="h-16 w-16 text-status-error" />
                    </div>
                </div>

                {/* Error Title */}
                <h1 className="text-2xl font-bold text-text-primary mb-2">
                    页面出错了
                </h1>

                {/* Error Message */}
                <p className="text-text-muted mb-6">
                    抱歉，页面遇到了一些问题。请尝试刷新页面或返回首页。
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                    <Button
                        variant="primary"
                        onClick={onReload}
                        className="flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        刷新页面
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onGoHome}
                        className="flex items-center justify-center gap-2"
                    >
                        <Home className="h-4 w-4" />
                        返回首页
                    </Button>
                </div>

                {/* Error Details (Development Only) */}
                {showDetails && error && (
                    <div className="mt-8 text-left">
                        <button
                            onClick={() => setShowStack(!showStack)}
                            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors mb-2"
                        >
                            <Bug className="h-4 w-4" />
                            {showStack ? '隐藏错误详情' : '显示错误详情'}
                        </button>
                        
                        {showStack && (
                            <div className="bg-surface-secondary rounded-lg p-4 overflow-auto max-h-64">
                                <p className="text-sm font-mono text-status-error mb-2">
                                    {error.name}: {error.message}
                                </p>
                                {errorInfo?.componentStack && (
                                    <pre className="text-xs font-mono text-text-muted whitespace-pre-wrap">
                                        {errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Help Text */}
                <p className="text-xs text-text-muted mt-6">
                    如果问题持续存在，请联系系统管理员
                </p>
            </div>
        </div>
    )
}

export { GlobalErrorBoundary, GlobalErrorPage }
