import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/utils/cn"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
    id: string
    type: ToastType
    message: string
    duration?: number
}

interface ToastProps extends ToastData {
    onClose: (id: string) => void
}

const toastIcons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
}

const toastStyles: Record<ToastType, string> = {
    success: "bg-status-success/10 border-status-success/30 text-status-success",
    error: "bg-status-error/10 border-status-error/30 text-status-error",
    warning: "bg-status-warning/10 border-status-warning/30 text-status-warning",
    info: "bg-primary/10 border-primary/30 text-primary",
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 3000, onClose }) => {
    React.useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => onClose(id), duration)
            return () => clearTimeout(timer)
        }
    }, [id, duration, onClose])

    return (
        <div
            role="alert"
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg",
                "animate-in slide-in-from-right fade-in duration-300",
                "min-w-[300px] max-w-[400px]",
                toastStyles[type]
            )}
        >
            {toastIcons[type]}
            <span className="flex-1 text-sm font-medium">{message}</span>
            <button
                onClick={() => onClose(id)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="关闭"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}

// Toast Container
interface ToastContainerProps {
    toasts: ToastData[]
    onClose: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    if (toasts.length === 0) return null

    return createPortal(
        <div 
            className="fixed top-4 right-4 z-[100] flex flex-col gap-2"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={onClose} />
            ))}
        </div>,
        document.body
    )
}

// Toast Context and Hook
interface ToastContextValue {
    toasts: ToastData[]
    addToast: (type: ToastType, message: string, duration?: number) => void
    removeToast: (id: string) => void
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = React.useState<ToastData[]>([])

    const addToast = React.useCallback((type: ToastType, message: string, duration = 3000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        setToasts((prev) => [...prev, { id, type, message, duration }])
    }, [])

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    const value = React.useMemo(() => ({
        toasts,
        addToast,
        removeToast,
        success: (message: string, duration?: number) => addToast('success', message, duration),
        error: (message: string, duration?: number) => addToast('error', message, duration),
        warning: (message: string, duration?: number) => addToast('warning', message, duration),
        info: (message: string, duration?: number) => addToast('info', message, duration),
    }), [toasts, addToast, removeToast])

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    )
}

export const useToast = (): ToastContextValue => {
    const context = React.useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export { Toast, ToastContainer }
