import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-500",
          actionButton:
            "group-[.toast]:bg-primary-500 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500",
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
