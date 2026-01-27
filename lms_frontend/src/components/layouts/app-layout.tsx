import * as React from "react"
import { Header } from "./header"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "react-router-dom"

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * 主应用布局组件 - 极致美学版
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { currentRole } = useAuth()
  const location = useLocation()

  // 根据角色映射主题类名
  const themeClass = React.useMemo(() => {
    switch (currentRole) {
      case 'MENTOR':
        return 'theme-mentor'
      case 'TEAM_MANAGER':
        return 'theme-manager'
      case 'ADMIN':
      default:
        return 'theme-default'
    }
  }, [currentRole])

  return (
    <div className={cn("min-h-screen relative isolate bg-muted flex flex-col", themeClass)} style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 rounded-full -translate-y-1/2 translate-x-1/2 will-change-transform" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary-500/5 rounded-full translate-y-1/2 -translate-x-1/2 will-change-transform" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-warning-500/5 rounded-full will-change-transform" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <Header />

        {/* Main content area */}
        <main
          className="pt-24 px-6 pb-12 mx-auto w-full flex-1 flex flex-col"
          style={{
            maxWidth: "var(--container-max-width, 1400px)"
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex-1 flex flex-col h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}