import { config } from '@/config/app-config'

export const BrandMark = () => {
  return (
    <div className="flex items-end gap-2.5 px-1">
      <img src="/logo.svg" alt={config.appName} className="h-6 w-6 shrink-0 object-contain" />
      <span aria-label="LMS" className="flex items-end whitespace-nowrap">
        <span
          className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-slate-900"
          style={{
            fontFamily: '"Avenir Next", "Helvetica Neue", var(--theme-font-heading)',
          }}
        >
          LMS
        </span>
      </span>
    </div>
  )
}
