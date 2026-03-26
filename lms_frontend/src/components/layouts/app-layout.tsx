import * as React from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { useCurrentRole } from '@/hooks/use-current-role'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const currentRole = useCurrentRole()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const themeClass = React.useMemo(() => {
    switch (currentRole) {
      case 'STUDENT':
      case 'TEAM_MANAGER':
        return 'theme-student'
      case 'MENTOR':
      case 'DEPT_MANAGER':
        return 'theme-mentor'
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'theme-admin'
      default:
        return 'theme-admin'
    }
  }, [currentRole])

  return (
    <div className={cn('flex min-h-screen bg-muted', themeClass)}>
      {/* Sidebar - 桌面端 */}
      <div className="hidden w-[272px] shrink-0 lg:block" aria-hidden="true" />
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[272px] bg-white lg:block">
        <Sidebar />
      </div>

      {/* 移动端 Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full w-[272px] max-w-[calc(100vw-1rem)] bg-white">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* 移动端菜单按钮 */}
      <button
        className="lg:hidden fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-text-muted shadow-[0_10px_24px_rgba(148,163,184,0.2)] backdrop-blur-sm transition-colors hover:text-foreground"
        onClick={() => setSidebarOpen(true)}
        aria-label="打开菜单"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* 主内容区 */}
      <main className="flex-1 min-w-0">
        <div className="flex w-full min-w-0 flex-col px-5 py-6 md:px-8 xl:px-10">
          {children}
        </div>
      </main>

      <ThemeSwitcher />
    </div>
  )
}
