import * as React from 'react'
import { Moon } from 'lucide-react'

import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

type ThemeOption = {
  value: 'light' | 'scholar' | 'dark'
  label: string
  icon: React.FC<{ className?: string }>
}

const ThemeSunIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="10" cy="10" r="3" />
    <path d="M10 2.8v2M10 15.2v2M2.8 10h2M15.2 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M4.8 15.2l1.4-1.4M13.8 6.2l1.4-1.4" />
  </svg>
)

const ThemeBookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 15.5V5a2 2 0 0 1 2-2h9v12.5H6a2 2 0 0 0-2 2Z" />
    <path d="M4 15.5A2 2 0 0 1 6 13.5h9" />
  </svg>
)

const ThemeMoonIcon = ({ className }: { className?: string }) => <Moon className={className} strokeWidth={1.8} />

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', icon: ThemeSunIcon, label: '明亮' },
  { value: 'scholar', icon: ThemeBookIcon, label: '书院' },
  { value: 'dark', icon: ThemeMoonIcon, label: '暗夜' },
]

interface ThemeSwitcherProps {
  className?: string
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = React.useState(false)

  const activeOption = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0]
  const ActiveIcon = activeOption.icon
  const inactiveOptions = THEME_OPTIONS.filter((option) => option.value !== theme)

  const handleToggle = () => {
    setIsOpen((current) => !current)
  }

  const handleSelect = (value: ThemeOption['value']) => {
    setTheme(value)
    setIsOpen(false)
  }

  return (
    <div
      className={cn('fixed bottom-6 right-6 z-40', className)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div
        className="relative flex items-center justify-end"
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsOpen(false)
          }
        }}
      >
        <div className="flex items-center gap-3">
          {inactiveOptions.map((option, index) => {
            const Icon = option.icon

            return (
              <div
                key={option.value}
                className={cn(
                  'transition-all duration-200 ease-out',
                  isOpen ? 'w-9 overflow-visible opacity-100' : 'w-0 overflow-hidden opacity-0'
                )}
                style={{
                  transitionDelay: isOpen ? `${index * 32}ms` : '0ms',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  aria-label={`切换到${option.label}主题`}
                  title={option.label}
                  tabIndex={isOpen ? 0 : -1}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full bg-background text-text-muted ring-1 ring-border/70 transition-all duration-200 ease-out',
                    'shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm',
                    'hover:-translate-y-0.5 hover:text-foreground hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]',
                    isOpen ? 'translate-x-0 scale-100' : 'translate-x-4 scale-90'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={handleToggle}
            aria-label="切换主题"
            aria-expanded={isOpen}
            title={`当前主题：${activeOption.label}`}
            className={cn(
              'relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-border/70 transition-all duration-200',
              'shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)]'
            )}
          >
            <ActiveIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  )
}
