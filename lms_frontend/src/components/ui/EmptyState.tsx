import * as React from "react"
import { cn } from "@/utils/cn"
import { Inbox, FileQuestion, Search, FolderOpen } from "lucide-react"
import { Button } from "./Button"

export type EmptyStateVariant = 'default' | 'search' | 'folder' | 'question'

export interface EmptyStateProps {
    /** Title text */
    title?: string
    /** Description text */
    description?: string
    /** Icon variant */
    variant?: EmptyStateVariant
    /** Custom icon */
    icon?: React.ReactNode
    /** Action button text */
    actionText?: string
    /** Action button callback */
    onAction?: () => void
    /** Additional class names */
    className?: string
    /** Children for custom content */
    children?: React.ReactNode
}

const variantIcons: Record<EmptyStateVariant, React.ReactNode> = {
    default: <Inbox className="h-12 w-12" />,
    search: <Search className="h-12 w-12" />,
    folder: <FolderOpen className="h-12 w-12" />,
    question: <FileQuestion className="h-12 w-12" />,
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title = "暂无数据",
    description,
    variant = 'default',
    icon,
    actionText,
    onAction,
    className,
    children,
}) => {
    const displayIcon = icon || variantIcons[variant]

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-12 px-4 text-center",
                className
            )}
        >
            <div className="text-text-muted/50 mb-4">
                {displayIcon}
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-text-muted max-w-sm mb-4">
                    {description}
                </p>
            )}
            {children}
            {actionText && onAction && (
                <Button variant="primary" onClick={onAction} className="mt-4">
                    {actionText}
                </Button>
            )}
        </div>
    )
}
EmptyState.displayName = "EmptyState"

export { EmptyState }
