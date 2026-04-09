import * as React from "react"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

/**
 * 认证页面布局组件 - 极致美学版 (Premium Immersive)
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  description,
  className,
}) => {
  return (
    <div className="min-h-screen relative flex flex-col lg:flex-row bg-background text-foreground selection:bg-primary selection:text-white font-sans overflow-hidden">
      {/* 现代“米字格/稿纸”底纹 */}
      <div
        className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--color-primary) 0.5px, transparent 0.5px), linear-gradient(90deg, var(--color-primary) 0.5px, transparent 0.5px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* 左侧：人文叙事区 (Oriental Narrative) */}
      <div className="relative flex-1 lg:h-screen flex items-center justify-center p-8 lg:p-24 border-b lg:border-b-0 lg:border-r border-gray-900/5">
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">

          {/* 红色印章风格 Logo - 学·练·考 三位一体 */}
          <div className="flex flex-col gap-5">
            {[
              { char: '学', delay: 0 },
              { char: '练', delay: 0.2 },
              { char: '考', delay: 0.4 }
            ].map((item) => (
              <div
                key={item.char}
                className="w-14 h-14 bg-primary flex items-center justify-center relative overflow-hidden group"
              >
                {/* 装饰性暗纹 */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:4px_4px]" />
                <span className="text-white text-2xl font-serif font-black leading-none relative z-10">{item.char}</span>

                {/* 悬停微动效 */}
                <div className="absolute inset-0 bg-background opacity-0 group-hover:opacity-10 transition-opacity" />
              </div>
            ))}
          </div>

          {/* 纵向大标题 - 书院风骨 */}
          <div className="relative flex flex-col items-center lg:items-start">
            <h1
              className="text-6xl lg:text-8xl font-black leading-tight [writing-mode:vertical-rl] tracking-[0.2em] relative"
            >
              博学笃行
              <div className="absolute -right-4 top-0 bottom-0 w-[1px] bg-primary/20" />
            </h1>

            <div className="mt-12 lg:mt-0 lg:ml-20 max-w-[12rem]">
              <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.4em] text-primary mb-4">
                <span className="inline-block w-1 h-1 bg-primary" />
                岁在丙午 · 智启新章
              </div>
              <p className="text-sm font-medium leading-[1.8] text-foreground/50 [writing-mode:vertical-rl] lg:[writing-mode:horizontal-tb]">
                格物致知，诚意正心。每一份知识的存档，都是通往卓越的阶梯。
              </p>
            </div>
          </div>
        </div>

        {/* 背景大字装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40vw] font-black text-foreground/[0.015] select-none pointer-events-none">
          悟
        </div>
      </div>

      {/* 右侧：登录操作区 (The Chamber) */}
      <div className="relative w-full lg:w-[40rem] min-h-screen flex flex-col items-center justify-center p-8 lg:p-24 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-20 flex flex-col items-center lg:items-start">
            <div className="inline-block px-3 py-1 bg-primary text-white text-[10px] font-black tracking-[0.5em] mb-8">
              卷首
            </div>
            {title && (
              <h2 className="text-5xl font-black tracking-tight text-foreground mb-4">
                {title}
              </h2>
            )}
            {description && (
              <div className="flex items-center gap-4">
                <div className="h-[1px] w-8 bg-gray-900/20" />
                <p className="text-sm font-medium text-foreground/40 tracking-widest">
                  {description}
                </p>
              </div>
            )}
          </div>

          <div className={cn("w-full", className)}>
            {children}
          </div>
        </div>

        {/* 页脚细节 */}
        <div className="absolute bottom-12 flex flex-col items-center gap-4">
          <div className="h-10 w-[1px] bg-gradient-to-b from-transparent to-primary/30" />
          <p className="text-[10px] font-bold text-foreground/20 tracking-[0.5em] uppercase">
            &copy; {new Date().getFullYear()} 学习平台
          </p>
        </div>
      </div>
    </div>
  )
}
