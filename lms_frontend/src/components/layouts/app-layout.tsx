import * as React from "react"
import { Header } from "./header"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * 主应用布局组件 - 极致美学版
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { currentRole } = useAuth()

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
    <div className={cn("min-h-screen relative isolate bg-muted flex flex-col", themeClass)}>
      {/* 动态背景层 - 万卷书海 (The Ancient Scroll) - 以“竹简古籍”为核心意蕴的设计 */}
      {(() => {
        // 角色配色与标签配置 - 每个角色固定颜色，与 header.tsx 保持一致
        const configs = {
          STUDENT: {
            color: "#0EA5E9", // 天蓝 (Sky-500)
            label: "学 员 模 式 // 专注 · 成长 · 探索",
            ref: "卷号索引: STU-2026",
            bgTint: "rgba(14, 165, 233, 0.025)"
          },
          MENTOR: {
            color: "#10B981", // 翠绿 (Emerald-500)
            label: "导 师 模 式 // 指导 · 评估 · 严谨",
            ref: "卷号索引: MEN-2026",
            bgTint: "rgba(16, 185, 129, 0.025)"
          },
          DEPT_MANAGER: {
            color: "#8B5CF6", // 紫色 (Violet-500)
            label: "室 经 理 模 式 // 管理 · 协调 · 统筹",
            ref: "卷号索引: DEPT-2026",
            bgTint: "rgba(139, 92, 246, 0.025)"
          },
          TEAM_MANAGER: {
            color: "#F59E0B", // 琥珀色 (Amber-500)
            label: "团 队 管 理 // 协作 · 效能",
            ref: "卷号索引: TEAM-MGMT",
            bgTint: "rgba(245, 158, 11, 0.025)"
          },
          ADMIN: {
            color: "#F43F5E", // 玫红 (Rose-500)
            label: "管 理 后 台 // 架构 · 权限 · 全局",
            ref: "卷号索引: ROOT-ADMIN",
            bgTint: "rgba(244, 63, 94, 0.025)"
          }
        };

        const config = configs[currentRole as keyof typeof configs] || configs.ADMIN;

        return (
          <>
            {/* 1. 基础氛围底色 (模拟宣纸/竹片材质感 - 色彩感加强) */}
            <div className="fixed inset-0 -z-20 bg-background" />
            <div className="fixed inset-0 -z-20" style={{ backgroundColor: config.bgTint }} />

            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden isolate" aria-hidden="true">
              {/* 2. 有机色彩纹理 (Organic Color Texture) - 调淡质感 */}
              <div
                className="absolute inset-0 opacity-[0.025] mix-blend-multiply"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundColor: config.color
                }}
              />

              {/* 3. 竹简结构与色彩深度 - 透明度降至 0.05 */}
              <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  // 在 0px 位置补上一条线，确保左侧没有间距感
                  backgroundImage: `linear-gradient(90deg, ${config.color} 0px, ${config.color} 0.5px, transparent 0.5px, transparent 47px, ${config.color} 47.5px, transparent 48px)`,
                  backgroundSize: '48px 100%',
                  maskImage: 'linear-gradient(to bottom, black 15%, transparent 95%)'
                }}
              />

              {/* 4. 中式竖向题刻 - 调淡字色 */}
              <div
                className="absolute top-24 left-[18px] text-[13px] font-semibold tracking-[0.8em] opacity-35 select-none whitespace-nowrap"
                style={{
                  color: config.color,
                  writingMode: 'vertical-rl',
                  textOrientation: 'upright',
                }}
              >
                {config.label}
              </div>

              {/* 5. 落款与印章 (Seal Style) - 调淡 */}
              <div className="absolute bottom-12 right-12 flex flex-row-reverse gap-5 opacity-30 select-none">
                <div
                  className="text-[11px] border-2 border-current p-1.5 leading-none rounded-[1px] font-bold"
                  style={{ color: config.color, writingMode: 'vertical-rl' }}
                >
                  {config.ref}
                </div>
                <div className="text-[10px] font-serif self-end flex flex-col gap-1 font-medium" style={{ color: config.color }}>
                  <span>二〇二六</span>
                  <span>正序运行</span>
                </div>
              </div>

              {/* 7. 动态掠光：增加质感亮色 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_10s_infinite] pointer-events-none" />
            </div>
          </>
        );
      })()}

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
          <div className="flex-1 flex flex-col h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
