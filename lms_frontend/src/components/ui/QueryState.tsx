/**
 * Query State Components
 * Unified loading and error state display for API requests
 * Requirements: 23.1, 23.2, 23.3 - Consistent loading indicators and error messages
 */

import * as React from "react"
import { cn } from "@/utils/cn"
import { Spinner, InlineLoader } from "./Spinner"
import { ErrorState, ErrorStateVariant } from "./ErrorState"
import { ApiError, NetworkError } from "@/lib/api"

/**
 * Determine error variant based on error type
 */
function getErrorVariant(error: Error | null): ErrorStateVariant {
    if (!error) return 'default'
    
    if (error instanceof NetworkError) {
        return 'network'
    }
    
    if (error instanceof ApiError) {
        switch (error.status) {
            case 403:
                return 'permission'
            case 404:
                return 'notFound'
            default:
                return 'default'
        }
    }
    
    return 'default'
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: Error | null): string {
    if (!error) return '发生了未知错误'
    
    if (error instanceof NetworkError) {
        return error.message
    }
    
    if (error instanceof ApiError) {
        return error.message
    }
    
    return error.message || '发生了未知错误'
}

/**
 * Props for QueryStateWrapper
 */
export interface QueryStateWrapperProps {
    /** Whether the query is loading */
    isLoading: boolean
    /** Error from the query */
    error: Error | null
    /** Retry function */
    onRetry?: () => void
    /** Whether retry is in progress */
    isRetrying?: boolean
    /** Children to render when data is available */
    children: React.ReactNode
    /** Loading variant */
    loadingVariant?: 'spinner' | 'inline' | 'overlay'
    /** Loading text */
    loadingText?: string
    /** Custom loading component */
    loadingComponent?: React.ReactNode
    /** Custom error component */
    errorComponent?: React.ReactNode
    /** Error title override */
    errorTitle?: string
    /** Error message override */
    errorMessage?: string
    /** Additional class names for the container */
    className?: string
    /** Minimum height for loading state */
    minHeight?: string
}

/**
 * QueryStateWrapper Component
 * Wraps content with consistent loading and error states
 */
export const QueryStateWrapper: React.FC<QueryStateWrapperProps> = ({
    isLoading,
    error,
    onRetry,
    isRetrying = false,
    children,
    loadingVariant = 'spinner',
    loadingText = '加载中...',
    loadingComponent,
    errorComponent,
    errorTitle,
    errorMessage,
    className,
    minHeight = '200px',
}) => {
    // Loading state
    if (isLoading) {
        if (loadingComponent) {
            return <>{loadingComponent}</>
        }

        switch (loadingVariant) {
            case 'inline':
                return (
                    <div className={cn("flex items-center justify-center py-4", className)}>
                        <InlineLoader text={loadingText} />
                    </div>
                )
            case 'overlay':
                return (
                    <div className={cn("relative", className)} style={{ minHeight }}>
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                            <div className="flex flex-col items-center gap-2">
                                <Spinner size="lg" />
                                <span className="text-sm text-text-muted">{loadingText}</span>
                            </div>
                        </div>
                    </div>
                )
            default:
                return (
                    <div 
                        className={cn("flex items-center justify-center", className)} 
                        style={{ minHeight }}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <Spinner size="lg" />
                            <span className="text-sm text-text-muted">{loadingText}</span>
                        </div>
                    </div>
                )
        }
    }

    // Error state
    if (error) {
        if (errorComponent) {
            return <>{errorComponent}</>
        }

        const variant = getErrorVariant(error)
        const message = errorMessage || getErrorMessage(error)
        const title = errorTitle || (variant === 'network' ? '网络连接失败' : '加载失败')

        return (
            <ErrorState
                variant={variant}
                title={title}
                message={message}
                onRetry={onRetry}
                retrying={isRetrying}
                className={className}
            />
        )
    }

    // Success state - render children
    return <>{children}</>
}

/**
 * Props for PageQueryState
 */
export interface PageQueryStateProps extends Omit<QueryStateWrapperProps, 'minHeight'> {
    /** Minimum height for page loading state */
    minHeight?: string
}

/**
 * PageQueryState Component
 * Full page loading and error states for page-level queries
 */
export const PageQueryState: React.FC<PageQueryStateProps> = ({
    minHeight = '60vh',
    className,
    ...props
}) => {
    return (
        <QueryStateWrapper
            {...props}
            minHeight={minHeight}
            className={cn("min-h-[60vh]", className)}
        />
    )
}

/**
 * Props for CardQueryState
 */
export interface CardQueryStateProps extends Omit<QueryStateWrapperProps, 'minHeight' | 'loadingVariant'> {
    /** Minimum height for card loading state */
    minHeight?: string
}

/**
 * CardQueryState Component
 * Compact loading and error states for card-level queries
 */
export const CardQueryState: React.FC<CardQueryStateProps> = ({
    minHeight = '120px',
    className,
    loadingText = '加载中',
    ...props
}) => {
    return (
        <QueryStateWrapper
            {...props}
            loadingVariant="inline"
            loadingText={loadingText}
            minHeight={minHeight}
            className={cn("py-8", className)}
        />
    )
}

/**
 * Props for InlineQueryState
 */
export interface InlineQueryStateProps {
    /** Whether the query is loading */
    isLoading: boolean
    /** Error from the query */
    error: Error | null
    /** Retry function */
    onRetry?: () => void
    /** Children to render when data is available */
    children: React.ReactNode
    /** Loading text */
    loadingText?: string
    /** Additional class names */
    className?: string
}

/**
 * InlineQueryState Component
 * Minimal inline loading and error states
 */
export const InlineQueryState: React.FC<InlineQueryStateProps> = ({
    isLoading,
    error,
    onRetry,
    children,
    loadingText = '加载中...',
    className,
}) => {
    if (isLoading) {
        return <InlineLoader text={loadingText} className={className} />
    }

    if (error) {
        return (
            <div className={cn("flex items-center gap-2 text-status-error text-sm", className)}>
                <span>{getErrorMessage(error)}</span>
                {onRetry && (
                    <button 
                        onClick={onRetry}
                        className="underline hover:no-underline"
                    >
                        重试
                    </button>
                )}
            </div>
        )
    }

    return <>{children}</>
}

export { getErrorVariant, getErrorMessage }
