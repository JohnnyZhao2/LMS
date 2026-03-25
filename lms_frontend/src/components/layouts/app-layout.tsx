import * as React from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'
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

  const bgTint = React.useMemo(() => {
    const tints: Record<string, string> = {
      STUDENT: 'rgba(14, 165, 233, 0.02)',
      MENTOR: 'rgba(16, 185, 129, 0.02)',
      DEPT_MANAGER: 'rgba(139, 92, 246, 0.02)',
      TEAM_MANAGER: 'rgba(245, 158, 11, 0.02)',
      ADMIN: 'rgba(244, 63, 94, 0.02)',
      SUPER_ADMIN: 'rgba(220, 38, 38, 0.02)',
    }
    return tints[currentRole as string] || tints.ADMIN
  }, [currentRole])

  return (
    <div className={cn('h-screen relative isolate', themeClass)}>
      <div className="fixed inset-0 -z-20 bg-muted" />
      <div className="fixed inset-0 -z-20" style={{ backgroundColor: bgTint }} />

      <div className="relative z-10 flex h-screen gap-3 p-3">
        {/* Sidebar - 桌面端 */}
        <div className="hidden h-full shrink-0 lg:flex">
          <Sidebar />
        </div>

        {/* 移动端 Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="relative h-full w-[272px] max-w-[calc(100vw-1rem)]">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* 移动端菜单按钮 */}
          <button
            className="lg:hidden fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/90 text-text-muted shadow-[0_10px_24px_rgba(148,163,184,0.2)] backdrop-blur-sm transition-colors hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开菜单"
          >
            <Menu className="w-5 h-5" />
          </button>

          <main className="flex-1 overflow-y-auto scrollbar-subtle">
            <div
              className="mx-auto flex w-full flex-1 flex-col px-4 py-6 lg:px-2"
              style={{ maxWidth: 'var(--container-max-width, 1200px)' }}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
