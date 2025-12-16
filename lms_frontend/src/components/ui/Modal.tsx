import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/utils/cn"
import { X } from "lucide-react"
import { Button } from "./Button"

export interface ModalProps {
    /** Whether the modal is open */
    open: boolean
    /** Callback when modal should close */
    onClose: () => void
    /** Modal title */
    title?: string
    /** Modal description */
    description?: string
    /** Modal content */
    children?: React.ReactNode
    /** Custom footer content (overrides default buttons) */
    footer?: React.ReactNode
    /** Close on backdrop click */
    closeOnBackdrop?: boolean
    /** Close on ESC key */
    closeOnEsc?: boolean
    /** Modal size */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    /** Additional class names for the modal content */
    className?: string
}

const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-[90vw] max-h-[90vh]"
}

const Modal: React.FC<ModalProps> = ({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    closeOnBackdrop = true,
    closeOnEsc = true,
    size = 'md',
    className,
}) => {
    const modalRef = React.useRef<HTMLDivElement>(null)

    // Handle ESC key
    React.useEffect(() => {
        if (!open || !closeOnEsc) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose()
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [open, closeOnEsc, onClose])

    // Lock body scroll when modal is open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => {
            document.body.style.overflow = ""
        }
    }, [open])

    // Focus trap
    React.useEffect(() => {
        if (!open) return

        const modal = modalRef.current
        if (!modal) return

        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        const handleTabKey = (event: KeyboardEvent) => {
            if (event.key !== "Tab") return

            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault()
                    lastElement?.focus()
                }
            } else {
                if (document.activeElement === lastElement) {
                    event.preventDefault()
                    firstElement?.focus()
                }
            }
        }

        document.addEventListener("keydown", handleTabKey)
        firstElement?.focus()

        return () => document.removeEventListener("keydown", handleTabKey)
    }, [open])

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
            onClose()
        }
    }

    if (!open) return null

    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            aria-describedby={description ? "modal-description" : undefined}
        >
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={handleBackdropClick}
                aria-hidden="true"
            />

            {/* Modal content */}
            <div
                ref={modalRef}
                className={cn(
                    "relative w-full bg-card border border-border rounded-xl shadow-2xl",
                    "animate-in fade-in zoom-in-95 duration-200",
                    sizeStyles[size],
                    className
                )}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="flex flex-col space-y-1.5 p-6 pb-4">
                        {title && (
                            <h2 
                                id="modal-title"
                                className="text-lg font-semibold text-text-primary"
                            >
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p 
                                id="modal-description"
                                className="text-sm text-text-muted"
                            >
                                {description}
                            </p>
                        )}
                    </div>
                )}

                {/* Close button */}
                <button
                    onClick={onClose}
                    className={cn(
                        "absolute right-4 top-4 p-1 rounded-md",
                        "text-text-muted hover:text-text-primary",
                        "hover:bg-white/5 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    aria-label="关闭"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Body */}
                {children && (
                    <div className="px-6 py-2">
                        {children}
                    </div>
                )}

                {/* Footer */}
                {footer !== undefined && (
                    <div className="flex items-center justify-end gap-2 p-6 pt-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
Modal.displayName = "Modal"

// Confirm Dialog - a specialized modal for confirmations
export interface ConfirmDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'danger'
    loading?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "确认",
    cancelText = "取消",
    variant = 'default',
    loading = false,
}) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            size="sm"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        {cancelText}
                    </Button>
                    <Button 
                        variant={variant === 'danger' ? 'danger' : 'primary'} 
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </Button>
                </>
            }
        />
    )
}
ConfirmDialog.displayName = "ConfirmDialog"

export { Modal, ConfirmDialog }
