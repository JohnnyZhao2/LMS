import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-border",
          description: "group-[.toast]:text-text-muted",
          actionButton:
            "group-[.toast]:bg-primary-500 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-text-muted",
          success:
            "group-[.toaster]:bg-success-50 group-[.toaster]:text-success-600 group-[.toaster]:border-success-100",
          error:
            "group-[.toaster]:bg-error-50 group-[.toaster]:text-error-600 group-[.toaster]:border-error-100",
          warning:
            "group-[.toaster]:bg-warning-50 group-[.toaster]:text-warning-500 group-[.toaster]:border-warning-100",
          info:
            "group-[.toaster]:bg-primary-50 group-[.toaster]:text-primary-600 group-[.toaster]:border-primary-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
